use opencadkernel::{
    brep::{
        geometry::Surface,
        mesh::{tessellate, BodyMesh, Mesh, TessellationTolerance},
        topology::Body,
    },
    space::Vec3,
};

/// Recover trim mismatches, redundant planar samples and undersampled two-edge faces.
/// Keep the original geometry and tolerance; incomplete solids remain excluded by the caller.
pub fn tessellate_body(body: &Body, tolerance: TessellationTolerance) -> BodyMesh {
    let mut original = repair_trims(body, tessellate(body, tolerance), tolerance);
    repair_planar_faces(body, &mut original, tolerance.linear);
    if original.is_complete() {
        return original;
    }
    // A shallow lens can have only two sampled endpoints despite having nonzero area.
    // Split the topological edges, preserving the exact curves and adjacent face loops.
    let mut edges = Vec::new();
    for key in &original.missing_faces {
        let face = body.faces.get(*key).unwrap();
        if !matches!(
            body.surfaces.get(face.surface),
            Some(Surface::Nurbs(_) | Surface::Plane(_))
        ) {
            continue;
        }
        let coedges = body.face_coedges(*key);
        if coedges.len() != 2 {
            continue;
        }
        if body.coedges.get(coedges[0]).unwrap().edge == body.coedges.get(coedges[1]).unwrap().edge
        {
            continue; // A repeated seam is not a two-edge lens.
        }
        for key in coedges {
            let edge = body.coedges.get(key).unwrap().edge;
            if !edges.contains(&edge) {
                edges.push(edge);
            }
        }
    }
    if edges.is_empty() {
        return original;
    }
    let mut split = body.clone();
    for key in edges {
        let edge = split.edges.get(key).unwrap();
        let parameter = (edge.start_parameter + edge.end_parameter) * 0.5;
        if opencadkernel::brep::split::split_edge(&mut split, key, parameter).is_none() {
            return original;
        }
    }
    if split.validate() != body.validate() {
        return original;
    }
    let mut retried = repair_trims(&split, tessellate(&split, tolerance), tolerance);
    repair_planar_faces(&split, &mut retried, tolerance.linear);
    if retried.is_complete() {
        retried
    } else {
        original
    }
}

fn repair_trims(body: &Body, original: BodyMesh, tolerance: TessellationTolerance) -> BodyMesh {
    if original.missing_faces.is_empty() {
        return original;
    }
    if !edges_project_within_tolerance(body, &original, &original, tolerance.linear) {
        return original;
    }
    let mut repaired = body.clone();
    let mut changed = false;
    for key in &original.missing_faces {
        let Some(face) = body.faces.get(*key) else {
            return original;
        };
        let Some(Surface::Nurbs(nurbs)) = body.surfaces.get(face.surface) else {
            return original;
        };
        if nurbs.periodicity().iter().any(|closed| *closed) {
            return original;
        }
        for coedge_key in body.face_coedges(*key) {
            let Some(coedge) = body.coedges.get(coedge_key) else {
                return original;
            };
            if coedge.pcurve.is_some() {
                repaired.coedges.get_mut(coedge_key).unwrap().pcurve = None;
                changed = true;
            }
        }
    }
    if !changed {
        return original;
    }
    let retried = tessellate(&repaired, tolerance);
    // Recheck after resampling: the retry can introduce additional edge samples.
    let within_tolerance =
        edges_project_within_tolerance(body, &original, &retried, tolerance.linear);
    if retried.is_complete() && within_tolerance {
        retried
    } else {
        original
    }
}

fn repair_planar_faces(body: &Body, mesh: &mut BodyMesh, linear: f64) {
    let missing = mesh.missing_faces.clone();
    for key in missing {
        let Some(face) = body.faces.get(key) else {
            continue;
        };
        let Some(Surface::Plane(plane)) = body.surfaces.get(face.surface) else {
            continue;
        };
        if face.loops.len() != 1 {
            continue;
        }
        let Some(normal) = plane.normal() else {
            continue;
        };
        // Use physical units for the 2D tolerance even if the stored plane axes are scaled.
        let Some(plane) =
            opencadkernel::space::Plane::orthonormal(plane.origin, plane.x_axis, normal)
        else {
            continue;
        };
        let Some(ring) = planar_ring(body, mesh, key, &plane, linear) else {
            continue;
        };
        let (points, triangles) = opencadkernel::geom2d::triangulate(&ring, &[]);
        if triangles.is_empty() {
            continue;
        }
        let normal = if face.forward {
            normal
        } else {
            normal.map(|v| -v)
        };
        let positions: Vec<_> = points.iter().map(|p| plane.point_at(*p)).collect();
        let mut patch = Mesh {
            positions,
            normals: vec![normal; points.len()],
            triangles: vec![],
        };
        for mut triangle in triangles {
            let [a, b, c] = triangle.map(|i| Vec3::from(patch.positions[i]));
            if (b - a).cross(c - a).dot(Vec3::from(normal)) < 0.0 {
                triangle.swap(1, 2);
            }
            patch.triangles.push(triangle);
        }
        mesh.triangle_faces
            .extend(std::iter::repeat(key).take(patch.triangles.len()));
        mesh.mesh.absorb(patch);
        mesh.missing_faces.retain(|candidate| *candidate != key);
    }
}

fn planar_ring(
    body: &Body,
    mesh: &BodyMesh,
    face: opencadkernel::brep::topology::FaceKey,
    plane: &opencadkernel::space::Plane,
    linear: f64,
) -> Option<Vec<[f64; 2]>> {
    let mut points: Vec<[f64; 3]> = vec![];
    for key in body.face_coedges(face) {
        let coedge = body.coedges.get(key)?;
        let samples = mesh.drawing_edges.iter().find(|e| e.edge == coedge.edge)?;
        if samples.positions.len() < 2 {
            return None;
        }
        let mut chain = samples.positions.clone();
        if !coedge.forward {
            chain.reverse();
        }
        if points
            .last()
            .is_some_and(|p| Vec3::from(*p).distance(Vec3::from(chain[0])) > linear)
        {
            return None;
        }
        for p in chain {
            if points
                .last()
                .is_none_or(|q| Vec3::from(*q).distance(Vec3::from(p)) > linear)
            {
                points.push(p);
            }
        }
    }
    if Vec3::from(*points.first()?).distance(Vec3::from(*points.last()?)) > linear {
        return None;
    }
    points.pop();
    let mut ring = Vec::new();
    for p in points {
        let uv = plane.project(p)?;
        if Vec3::from(p).distance(Vec3::from(plane.point_at(uv))) > linear {
            return None;
        }
        ring.push(uv);
    }
    // The existing polygon validator rejects crossings and removes redundant points.
    let polygon = opencadkernel::geom2d::triangulate::polygon_frame(
        &ring,
        opencadkernel::geom2d::Tolerance::new(linear),
    )?;
    Some(polygon.points)
}

fn edges_project_within_tolerance(
    body: &Body,
    original: &BodyMesh,
    samples_mesh: &BodyMesh,
    linear: f64,
) -> bool {
    original.missing_faces.iter().all(|key| {
        let face = body.faces.get(*key).unwrap();
        let surface = body.surfaces.get(face.surface).unwrap();
        body.face_coedges(*key).iter().all(|key| {
            let coedge = body.coedges.get(*key).unwrap();
            samples_mesh
                .drawing_edges
                .iter()
                .find(|edge| edge.edge == coedge.edge)
                .is_some_and(|samples| {
                    samples.positions.len() >= 2
                        && samples.positions.iter().all(|point| {
                            surface.parameters_at(*point).is_some_and(|(u, v)| {
                                let deviation =
                                    Vec3::from(surface.point_at(u, v)).distance(Vec3::from(*point));
                                deviation.is_finite() && deviation <= linear
                            })
                        })
                })
        })
    })
}

#[cfg(test)]
mod tests {
    use super::tessellate_body;
    use opencadkernel::brep::mesh::{tessellate, TessellationTolerance};
    #[test]
    fn repairs_inconsistent_trim_parameters() {
        let body = crate::test_shapes::trimmed_box(1e-7);
        let tolerance = TessellationTolerance::new(0.15, 1e-6);
        let original = tessellate(&body, tolerance);
        let repaired = tessellate_body(&body, tolerance);

        assert!(!original.is_complete());
        assert!(repaired.is_complete());
        assert!(
            !tessellate(&body, tolerance).is_complete(),
            "input must not be mutated"
        );
        let (volume, center) = repaired.mesh.mass_properties().unwrap();
        assert!((volume - 24.0).abs() < 1e-5);
        for (a, b) in center.iter().zip([1.0, 1.5, 2.0]) {
            assert!((a - b).abs() < 1e-5);
        }
    }
    #[test]
    fn refuses_edges_off_the_surface() {
        use opencadkernel::{brep::geometry::Surface, space::NurbsSurface3};
        let mut body = crate::test_shapes::trimmed_box(1e-7);
        let key = body.face_keys().next().unwrap();
        let surface_key = body.faces.get(key).unwrap().surface;
        let Surface::Nurbs(nurbs) = body.surfaces.get(surface_key).unwrap() else {
            panic!()
        };
        let (u, v) = nurbs.degrees();
        let (uk, vk) = nurbs.knots();
        let control = nurbs
            .control_points()
            .iter()
            .map(|row| row.iter().map(|p| p.map(|v| v + 0.1)).collect())
            .collect();
        let shifted = NurbsSurface3::new(u, v, control, uk.to_vec(), vk.to_vec(), None).unwrap();
        *body.surfaces.get_mut(surface_key).unwrap() = Surface::Nurbs(shifted);
        let tolerance = TessellationTolerance::new(0.15, 1e-6);
        let original = tessellate(&body, tolerance);
        // Check the projection guard independently: moving the surface may let the
        // kernel tessellate it, but must never qualify it for trim repair.
        let mut failed = tessellate(&crate::test_shapes::trimmed_box(1e-7), tolerance);
        failed.missing_faces = vec![key];
        assert!(!super::edges_project_within_tolerance(
            &body,
            &failed,
            &original,
            tolerance.linear
        ));
    }
    #[test]
    fn samples_shallow_lens_without_modifying_its_curves() {
        let body = crate::test_shapes::shallow_lens();
        let tolerance = TessellationTolerance::new(0.15, 1e-6);
        assert!(!tessellate(&body, tolerance).is_complete());
        let result = tessellate_body(&body, tolerance);
        assert!(result.is_complete());
        assert_eq!(body.edge_keys().count(), 2);
        assert!(!tessellate(&body, tolerance).is_complete());
        let area: f64 = result
            .mesh
            .triangles
            .iter()
            .map(|t| {
                let [a, b, c] =
                    t.map(|i| opencadkernel::space::Vec3::from(result.mesh.positions[i]));
                let cross = (b - a).cross(c - a);
                assert!(cross.z > 0.);
                cross.length() / 2.
            })
            .sum();
        assert!((area - 0.002).abs() < 1e-10);
    }

    #[test]
    fn samples_shallow_planar_lens() {
        use opencadkernel::{brep::geometry::Surface, space::Plane};
        let mut body = crate::test_shapes::shallow_lens();
        let key = body.face_keys().next().unwrap();
        let surface = body.faces.get(key).unwrap().surface;
        *body.surfaces.get_mut(surface).unwrap() = Surface::Plane(Plane {
            origin: [0.; 3],
            x_axis: [1., 0., 0.],
            y_axis: [0., 1., 0.],
        });
        let tolerance = TessellationTolerance::new(0.15, 1e-6);
        assert!(!tessellate(&body, tolerance).is_complete());
        let mesh = tessellate_body(&body, tolerance);
        assert!(mesh.is_complete());
        let area: f64 = mesh
            .mesh
            .triangles
            .iter()
            .map(|t| {
                let [a, b, c] = t.map(|i| opencadkernel::space::Vec3::from(mesh.mesh.positions[i]));
                (b - a).cross(c - a).length() / 2.
            })
            .sum();
        assert!((area - 0.002).abs() < 1e-10);
    }

    #[test]
    fn fills_planar_face_with_repeated_boundary_samples() {
        let (body, mut result) = crate::test_shapes::box_with_repeated_edge_samples();
        assert!(!result.is_complete());
        super::repair_planar_faces(&body, &mut result, 1e-6);
        assert!(result.is_complete());
        let (volume, centre) = result.mesh.mass_properties().unwrap();
        assert!((volume - 24.).abs() < 1e-8);
        for (a, b) in centre.iter().zip([1., 1.5, 2.]) {
            assert!((a - b).abs() < 1e-8);
        }
    }

    #[test]
    fn planar_retry_rejects_a_boundary_off_its_plane() {
        let (body, mut mesh) = crate::test_shapes::box_with_repeated_edge_samples();
        let tolerance = TessellationTolerance::new(0.15, 1e-6);
        let missing = mesh.missing_faces.clone();
        assert!(!missing.is_empty());
        for edge in &mut mesh.drawing_edges {
            for point in &mut edge.positions {
                for axis in point {
                    *axis += 0.1;
                }
            }
        }
        super::repair_planar_faces(&body, &mut mesh, tolerance.linear);
        assert_eq!(mesh.missing_faces, missing);
    }

    #[test]
    fn planar_retry_rejects_crossed_boundaries() {
        use opencadkernel::brep::geometry::Surface;
        let (body, mut mesh) = crate::test_shapes::box_with_repeated_edge_samples();
        let missing = mesh.missing_faces.clone();
        let face = body.faces.get(missing[0]).unwrap();
        let Surface::Plane(plane) = body.surfaces.get(face.surface).unwrap() else {
            panic!()
        };
        let bowtie = [[0., 0.], [2., 2.], [0., 2.], [2., 0.]];
        for (i, key) in body.face_coedges(missing[0]).iter().enumerate() {
            let coedge = body.coedges.get(*key).unwrap();
            let sample = mesh
                .drawing_edges
                .iter_mut()
                .find(|e| e.edge == coedge.edge)
                .unwrap();
            sample.positions = vec![
                plane.point_at(bowtie[i]),
                plane.point_at(bowtie[(i + 1) % 4]),
            ];
            if !coedge.forward {
                sample.positions.reverse();
            }
        }
        super::repair_planar_faces(&body, &mut mesh, 1e-6);
        assert_eq!(mesh.missing_faces, missing);
    }
}
