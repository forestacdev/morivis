use spade::handles::{FixedFaceHandle, FixedVertexHandle, InnerTag};
use spade::{ConstrainedDelaunayTriangulation, HasPosition, Point2, Triangulation};

#[derive(Clone, Copy, Debug)]
struct ParameterVertex {
    position: Point2<f64>,
    parameters: [f64; 2],
}

impl HasPosition for ParameterVertex {
    type Scalar = f64;

    fn position(&self) -> Point2<Self::Scalar> {
        self.position
    }
}

#[derive(Clone, Copy, Debug)]
pub(crate) struct ConstrainedTriangle {
    pub parameters: [[f64; 2]; 3],
    pub constraints: [bool; 3],
}

impl ConstrainedTriangle {
    fn matches(&self, other: &Self) -> bool {
        self.parameters.map(|p| p.map(f64::to_bits))
            == other.parameters.map(|p| p.map(f64::to_bits))
            && self.constraints == other.constraints
    }
}

#[derive(Default)]
struct FaceState {
    triangle: Option<ConstrainedTriangle>,
    accepted: bool,
}

#[derive(Default)]
struct Refinement {
    faces: Vec<FaceState>,
    pending: rustc_hash::FxHashSet<FixedFaceHandle<InnerTag>>,
}

pub(crate) struct ConstrainedMesh {
    triangulation: ConstrainedDelaunayTriangulation<ParameterVertex>,
    crossing_edges: Vec<[[f64; 2]; 2]>,
    crossing_bins: Vec<Vec<usize>>,
    origin: [f64; 2],
    scale: [f64; 2],
    refinement: Option<Refinement>,
}

impl ConstrainedMesh {
    pub fn new(rings: &[Vec<[f64; 2]>], split_crossings: bool) -> Option<Self> {
        if rings.is_empty() || rings.iter().any(|ring| ring.len() < 3) {
            return None;
        }
        let mut bounds = [[f64::INFINITY, f64::NEG_INFINITY]; 2];
        for point in rings.iter().flatten() {
            for axis in 0..2 {
                bounds[axis][0] = bounds[axis][0].min(point[axis]);
                bounds[axis][1] = bounds[axis][1].max(point[axis]);
            }
        }
        let origin = [bounds[0][0], bounds[1][0]];
        let scale = [bounds[0][1] - bounds[0][0], bounds[1][1] - bounds[1][0]];
        if scale
            .iter()
            .any(|value| !value.is_finite() || *value <= 0.0)
        {
            return None;
        }

        // Index ray crossings by height. Refinement asks this for every triangle;
        // scanning a dense imported trim on every pass otherwise dominates time.
        let crossing_edges: Vec<_> = rings
            .iter()
            .flat_map(|ring| {
                ring.iter()
                    .zip(ring.iter().cycle().skip(1))
                    .take(ring.len())
                    .filter(|(a, b)| a[1] != b[1])
                    .map(|(a, b)| [*a, *b])
            })
            .collect();
        let bin_count = crossing_edges.len().clamp(1, 64);
        let mut crossing_bins = vec![Vec::new(); bin_count];
        let bin = |y: f64| {
            (((y - origin[1]) / scale[1] * bin_count as f64).floor() as usize).min(bin_count - 1)
        };
        for (index, [a, b]) in crossing_edges.iter().enumerate() {
            for bucket in &mut crossing_bins[bin(a[1].min(b[1]))..=bin(a[1].max(b[1]))] {
                bucket.push(index);
            }
        }
        let mut mesh = Self {
            triangulation: ConstrainedDelaunayTriangulation::new(),
            crossing_edges,
            crossing_bins,
            origin,
            scale,
            refinement: None,
        };
        let mut handles = Vec::with_capacity(rings.len());
        for ring in rings {
            let mut ring_handles = Vec::with_capacity(ring.len());
            for parameters in ring {
                let vertex = mesh.vertex(*parameters);
                let handle = mesh.triangulation.insert(vertex).ok()?;
                if ring_handles.last() == Some(&handle) {
                    continue;
                }
                ring_handles.push(handle);
            }
            if ring_handles.first() == ring_handles.last() {
                ring_handles.pop();
            }
            if ring_handles.len() < 3 {
                return None;
            }
            handles.push(ring_handles);
        }
        for ring in handles {
            for index in 0..ring.len() {
                let from = ring[index];
                let to = ring[(index + 1) % ring.len()];
                if from == to
                    || (!mesh.triangulation.exists_constraint(from, to)
                        && mesh.triangulation.try_add_constraint(from, to).is_empty())
                {
                    if split_crossings && from != to {
                        let a = mesh.triangulation.vertex(from).data().parameters;
                        let b = mesh.triangulation.vertex(to).data().parameters;
                        mesh.constrain(a, b)?;
                    } else {
                        return None;
                    }
                }
            }
        }
        Some(mesh)
    }

    pub fn triangles(&self) -> Vec<ConstrainedTriangle> {
        self.triangulation
            .inner_faces()
            .filter_map(|face| self.triangle(face.fix()))
            .collect()
    }

    fn triangle(&self, handle: FixedFaceHandle<InnerTag>) -> Option<ConstrainedTriangle> {
        let face = self.triangulation.face(handle);
        let vertices = face.vertices();
        let parameters = vertices.map(|vertex| vertex.data().parameters);
        let centre = [
            parameters.iter().map(|point| point[0]).sum::<f64>() / 3.0,
            parameters.iter().map(|point| point[1]).sum::<f64>() / 3.0,
        ];
        self.inside(centre).then(|| ConstrainedTriangle {
            parameters,
            constraints: face.adjacent_edges().map(|edge| {
                edge.as_undirected().is_constraint_edge()
                    && edge.rev().face().as_inner().is_none_or(|neighbor| {
                        let points = neighbor.vertices().map(|v| v.data().parameters);
                        !self.inside([
                            points.iter().map(|p| p[0]).sum::<f64>() / 3.0,
                            points.iter().map(|p| p[1]).sum::<f64>() / 3.0,
                        ])
                    })
            }),
        })
    }

    /// Start after grid constraints have been installed. Face indices remain
    /// stable during Spade vertex insertion; this mesh never removes vertices.
    pub fn begin_refinement(&mut self) {
        self.refinement = Some(Refinement {
            faces: Vec::new(),
            pending: self
                .triangulation
                .inner_faces()
                .map(|face| face.fix())
                .collect(),
        });
    }

    /// Refresh only affected faces, in the same order as `inner_faces`.
    /// An accepted face needs no geometric check if its exact inputs survived.
    pub fn pending_triangles(&mut self) -> Vec<(FixedFaceHandle<InnerTag>, ConstrainedTriangle)> {
        let state = self.refinement.as_mut().expect("begin_refinement first");
        let mut pending: Vec<_> = state.pending.drain().collect();
        pending.sort_unstable_by_key(|face| face.index());
        state
            .faces
            .resize_with(self.triangulation.num_all_faces(), FaceState::default);
        let mut triangles = Vec::with_capacity(pending.len());
        for handle in pending {
            let triangle = self.triangle(handle);
            let state = &mut self.refinement.as_mut().unwrap().faces[handle.index()];
            let unchanged = match (&state.triangle, &triangle) {
                (Some(before), Some(after)) => before.matches(after),
                (None, None) => true,
                _ => false,
            };
            state.triangle = triangle;
            if !unchanged {
                state.accepted = false;
            }
            if !state.accepted {
                if let Some(triangle) = triangle {
                    triangles.push((handle, triangle));
                }
            }
        }
        triangles
    }

    pub fn accept_triangle(&mut self, face: FixedFaceHandle<InnerTag>) {
        self.refinement.as_mut().unwrap().faces[face.index()].accepted = true;
    }

    pub fn retry_triangle(&mut self, face: FixedFaceHandle<InnerTag>) {
        self.refinement.as_mut().unwrap().pending.insert(face);
    }

    /// Last checked pass, including accepted faces. Keep this snapshot until
    /// the next pass: insertion at an existing vertex may replace its UV data
    /// even when no vertex was added and refinement finishes without progress.
    pub fn checked_triangles(&self) -> Vec<ConstrainedTriangle> {
        self.refinement
            .as_ref()
            .unwrap()
            .faces
            .iter()
            .filter_map(|face| face.triangle)
            .collect()
    }

    fn invalidate_vertex(&mut self, vertex: FixedVertexHandle) {
        let Some(state) = &mut self.refinement else {
            return;
        };
        // Spade legalizes insertion by flipping edges opposite the inserted
        // vertex. Changed faces are in its final star. Include their neighbors
        // because a boundary flag also depends on the opposite face's centre.
        // This also covers replacement of an existing normalized vertex.
        for edge in self.triangulation.vertex(vertex).out_edges() {
            if let Some(face) = edge.face().as_inner() {
                state.pending.insert(face.fix());
                for edge in face.adjacent_edges() {
                    if let Some(neighbor) = edge.rev().face().as_inner() {
                        state.pending.insert(neighbor.fix());
                    }
                }
            }
        }
    }

    pub fn insert(&mut self, parameters: [f64; 2]) -> Option<bool> {
        let before = self.triangulation.num_vertices();
        let vertex = self.vertex(parameters);
        let handle = self.triangulation.insert(vertex).ok()?;
        self.invalidate_vertex(handle);
        Some(self.triangulation.num_vertices() > before)
    }

    pub fn constrain(&mut self, from: [f64; 2], to: [f64; 2]) -> Option<usize> {
        let before = self.triangulation.num_vertices();
        let from = self.triangulation.insert(self.vertex(from)).ok()?;
        let to = self.triangulation.insert(self.vertex(to)).ok()?;
        if from != to {
            let origin = self.origin;
            let scale = self.scale;
            let edges = self
                .triangulation
                .add_constraint_and_split(from, to, |position| ParameterVertex {
                    parameters: [
                        origin[0] + position.x * scale[0],
                        origin[1] + position.y * scale[1],
                    ],
                    position,
                });
            if edges.is_empty() {
                return None;
            }
        }
        if self.refinement.is_some() {
            self.begin_refinement();
        }
        Some(self.triangulation.num_vertices() - before)
    }

    fn vertex(&self, parameters: [f64; 2]) -> ParameterVertex {
        let step = f64::EPSILON;
        let normalized = [0, 1].map(|axis| {
            let value = (parameters[axis] - self.origin[axis]) / self.scale[axis];
            (value / step).round() * step
        });
        ParameterVertex {
            position: Point2::new(normalized[0], normalized[1]),
            parameters,
        }
    }

    fn inside(&self, point: [f64; 2]) -> bool {
        let y = (point[1] - self.origin[1]) / self.scale[1];
        if !y.is_finite() || y < 0.0 || y > 1.0 {
            return false;
        }
        let bin = ((y * self.crossing_bins.len() as f64).floor() as usize)
            .min(self.crossing_bins.len() - 1);
        self.crossing_bins[bin].iter().fold(false, |inside, index| {
            let [from, to] = self.crossing_edges[*index];
            inside
                ^ ((from[1] > point[1]) != (to[1] > point[1])
                    && point[0]
                        < (to[0] - from[0]) * (point[1] - from[1]) / (to[1] - from[1]) + from[0])
        })
    }
}

#[cfg(test)]
fn ring_contains(ring: &[[f64; 2]], point: [f64; 2]) -> bool {
    ring.iter()
        .zip(ring.iter().cycle().skip(1))
        .take(ring.len())
        .fold(false, |inside, (from, to)| {
            let crosses = (from[1] > point[1]) != (to[1] > point[1])
                && point[0]
                    < (to[0] - from[0]) * (point[1] - from[1]) / (to[1] - from[1]) + from[0];
            inside ^ crosses
        })
}

#[cfg(test)]
mod tests {
    use super::{ConstrainedMesh, ConstrainedTriangle};

    fn assert_same_triangles(actual: &[ConstrainedTriangle], expected: &[ConstrainedTriangle]) {
        assert_eq!(actual.len(), expected.len());
        for (a, b) in actual.iter().zip(expected) {
            assert!(
                a.matches(b),
                "triangle order, coordinates or boundary flags changed"
            );
        }
    }

    fn check_and_accept(mesh: &mut ConstrainedMesh) -> usize {
        let pending = mesh.pending_triangles();
        assert_same_triangles(&mesh.checked_triangles(), &mesh.triangles());
        for (face, _) in &pending {
            mesh.accept_triangle(*face);
        }
        pending.len()
    }

    #[test]
    fn local_updates_match_full_scan_with_holes_crossings_and_hull_growth() {
        let cases = [
            vec![vec![
                [0., 0.],
                [4., 0.],
                [4., 1.],
                [2., 1.],
                [2., 4.],
                [0., 4.],
            ]],
            vec![
                vec![[0., 0.], [4., 0.], [4., 4.], [0., 4.]],
                vec![[1., 1.], [3., 1.], [3., 3.], [1., 3.]],
            ],
            vec![vec![[0., 0.], [4., 4.], [0., 4.], [4., 0.]]],
        ];
        for rings in cases {
            let mut mesh = ConstrainedMesh::new(&rings, true).unwrap();
            mesh.constrain([0., 2.], [4., 2.]).unwrap();
            mesh.begin_refinement();
            check_and_accept(&mut mesh);
            let mut seed = 7u64;
            for batch in 0..80 {
                for _ in 0..5 {
                    let point = [0, 1].map(|_| {
                        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
                        // Includes points outside the trim and original convex hull.
                        (seed >> 32) as f64 / u32::MAX as f64 * 6. - 1.
                    });
                    mesh.insert(point).unwrap();
                }
                // Split trim and interior constraints, including their intersections.
                mesh.insert([batch as f64 / 20., 2.]).unwrap();
                check_and_accept(&mut mesh);
                assert!(mesh.pending_triangles().is_empty());
            }
        }
    }

    #[test]
    fn accepted_distant_faces_are_not_revisited() {
        let mut mesh =
            ConstrainedMesh::new(&[vec![[0., 0.], [2., 0.], [2., 2.], [0., 2.]]], false).unwrap();
        for x in 1..20 {
            for y in 1..20 {
                mesh.insert([x as f64 / 10., y as f64 / 10.]).unwrap();
            }
        }
        mesh.begin_refinement();
        let full_count = check_and_accept(&mut mesh);
        mesh.insert([0.23, 0.27]).unwrap();
        let local_count = check_and_accept(&mut mesh);
        assert!(local_count > 0);
        assert!(local_count < full_count / 10);
    }

    #[test]
    fn replacing_quantized_vertex_preserves_checked_snapshot_until_next_pass() {
        let mut mesh =
            ConstrainedMesh::new(&[vec![[0., 0.], [2., 0.], [2., 2.], [0., 2.]]], false).unwrap();
        mesh.insert([0.5, 0.5]).unwrap();
        mesh.begin_refinement();
        check_and_accept(&mut mesh);
        let before = mesh.checked_triangles();
        assert!(!mesh.insert([0.5 + f64::EPSILON / 2., 0.5]).unwrap());
        assert_same_triangles(&mesh.checked_triangles(), &before);
        assert!(before
            .iter()
            .zip(mesh.triangles())
            .any(|(a, b)| !a.matches(&b)));
        assert!(check_and_accept(&mut mesh) > 0);
        assert!(!mesh.insert([0.5 + f64::EPSILON / 2., 0.5]).unwrap());
        assert_eq!(check_and_accept(&mut mesh), 0);
    }

    #[test]
    fn unfinished_faces_and_changed_constraints_are_rechecked() {
        let mut mesh =
            ConstrainedMesh::new(&[vec![[0., 0.], [2., 0.], [2., 2.], [0., 2.]]], false).unwrap();
        mesh.begin_refinement();
        let pending = mesh.pending_triangles();
        mesh.retry_triangle(pending[0].0);
        for (face, _) in &pending[1..] {
            mesh.accept_triangle(*face);
        }
        let retried = mesh.pending_triangles();
        assert_eq!(retried.len(), 1);
        assert_eq!(retried[0].0, pending[0].0);
        mesh.accept_triangle(retried[0].0);
        mesh.constrain([1., 0.], [1., 2.]).unwrap();
        assert!(check_and_accept(&mut mesh) > 0);
    }

    #[test]
    fn indexed_crossings_match_even_odd_winding_with_holes() {
        let rings = vec![
            vec![[-3., -2.], [4., -2.], [4., 5.], [-3., 5.]],
            vec![[-1., 0.], [2., 0.], [2., 3.], [-1., 3.]],
        ];
        let mesh = ConstrainedMesh::new(&rings, false).unwrap();
        for x in -40..=50 {
            for y in -30..=60 {
                let point = [x as f64 / 10., y as f64 / 10.];
                assert_eq!(
                    mesh.inside(point),
                    rings
                        .iter()
                        .filter(|ring| super::ring_contains(ring, point))
                        .count()
                        % 2
                        == 1
                );
            }
        }
    }

    #[test]
    fn grid_constraints_remain_refinable_inside_the_face() {
        let mut mesh =
            ConstrainedMesh::new(&[vec![[0., 0.], [2., 0.], [2., 2.], [0., 2.]]], false).unwrap();
        mesh.constrain([1., 0.], [1., 2.]).unwrap();
        let triangles = mesh.triangles();
        let mut interior = 0;
        for triangle in triangles {
            for (i, [a, b]) in [[0, 1], [1, 2], [2, 0]].into_iter().enumerate() {
                let p = triangle.parameters[a];
                let q = triangle.parameters[b];
                if p[0] == 1. && q[0] == 1. {
                    assert!(!triangle.constraints[i]);
                    interior += 1;
                }
                if (p[0] == q[0] && (p[0] == 0. || p[0] == 2.))
                    || (p[1] == q[1] && (p[1] == 0. || p[1] == 2.))
                {
                    assert!(triangle.constraints[i]);
                }
            }
        }
        assert_eq!(interior, 2);
    }

    #[test]
    fn crossing_trim_segments_preserve_even_odd_regions() {
        let rings = [vec![[0., 0.], [2., 2.], [0., 2.], [2., 0.]]];
        assert!(ConstrainedMesh::new(&rings, false).is_none());
        let mesh = ConstrainedMesh::new(&rings, true).unwrap();
        let area: f64 = mesh
            .triangles()
            .iter()
            .map(|t| {
                let [a, b, c] = t.parameters;
                ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])).abs() / 2.
            })
            .sum();
        assert!((area - 2.).abs() < 1e-12);
    }
}
