use opencadkernel::{
    brep::{
        geometry::Surface,
        mesh::{tessellate, BodyMesh, TessellationTolerance},
        topology::Body,
    },
    space::Vec3,
};

/// Retry inconsistent trim parameters using the same 3D edges and surfaces.
/// Periodic seams and edges that cannot be projected within tolerance are excluded.
pub fn tessellate_body(body: &Body, tolerance: TessellationTolerance) -> BodyMesh {
    let original = tessellate(body, tolerance);
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
}
