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

pub(crate) struct ConstrainedMesh {
    triangulation: ConstrainedDelaunayTriangulation<ParameterVertex>,
    crossing_edges: Vec<[[f64; 2]; 2]>,
    crossing_bins: Vec<Vec<usize>>,
    origin: [f64; 2],
    scale: [f64; 2],
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
            .filter_map(|face| {
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
            })
            .collect()
    }

    pub fn insert(&mut self, parameters: [f64; 2]) -> Option<bool> {
        let before = self.triangulation.num_vertices();
        let vertex = self.vertex(parameters);
        self.triangulation.insert(vertex).ok()?;
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
    use super::ConstrainedMesh;

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
