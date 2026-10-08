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
    let original = tessellate_with_repairs(body, tolerance);
    if original.is_complete()
        || tolerance != TessellationTolerance::new(tolerance.angle, tolerance.linear)
    {
        return original;
    }
    // On thin planar regions, chords from independently sampled arcs can cross.
    // Tighten boundary sampling using the kernel's existing chordal policy.
    let planar_arcs = original.missing_faces.iter().all(|key| {
        let face = body.faces.get(*key).unwrap();
        matches!(body.surfaces.get(face.surface), Some(Surface::Plane(_)))
            && body.face_coedges(*key).iter().any(|key| {
                let edge = body
                    .edges
                    .get(body.coedges.get(*key).unwrap().edge)
                    .unwrap();
                matches!(
                    body.curves.get(edge.curve),
                    Some(
                        opencadkernel::brep::geometry::Curve3::Circle(_)
                            | opencadkernel::brep::geometry::Curve3::Ellipse(_)
                    )
                )
            })
    });
    if !planar_arcs {
        return original;
    }
    let refined = tessellate_with_repairs(
        body,
        tolerance.with_chordal_deflection(tolerance.linear * 100.),
    );
    if refined.is_complete() {
        refined
    } else {
        original
    }
}

fn tessellate_with_repairs(body: &Body, tolerance: TessellationTolerance) -> BodyMesh {
    let mut original = repair_trims(body, tessellate(body, tolerance), tolerance);
    repair_planar_faces(body, &mut original, tolerance.linear);
    repair_collapsed_slits(body, &mut original, tolerance.linear);
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

// An opposite traversal of one tiny spline has no enclosed area. Positive
// rational weights keep the entire curve inside its control hull. Do not infer
// this from coincident endpoints: a closed rim can bound a real periodic face.
fn repair_collapsed_slits(body: &Body, mesh: &mut BodyMesh, linear: f64) {
    mesh.missing_faces.retain(|key| {
        let face = body.faces.get(*key).unwrap();
        let Some(Surface::Nurbs(surface)) = body.surfaces.get(face.surface) else {
            return true;
        };
        if surface.periodicity() != [false, false] || face.loops.len() != 1 {
            return true;
        }
        let coedges = body.face_coedges(*key);
        let [a, b] = coedges.as_slice() else {
            return true;
        };
        let (a, b) = (body.coedges.get(*a).unwrap(), body.coedges.get(*b).unwrap());
        if a.edge != b.edge || a.forward == b.forward || a.pcurve.is_some() || b.pcurve.is_some() {
            return true;
        }
        let edge = body.edges.get(a.edge).unwrap();
        let Some(opencadkernel::brep::geometry::Curve3::Nurbs(curve)) = body.curves.get(edge.curve)
        else {
            return true;
        };
        let controls = curve.control_points();
        let center = (Vec3::from(controls[0]) + Vec3::from(*controls.last().unwrap())) * 0.5;
        !controls
            .iter()
            .all(|p| Vec3::from(*p).distance(center) <= linear)
    });
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
        let coedges = body.face_coedges(key);
        let undersampled_lens = coedges.len() == 2
            && coedges.iter().all(|c| {
                mesh.drawing_edges
                    .iter()
                    .find(|e| e.edge == body.coedges.get(*c).unwrap().edge)
                    .is_some_and(|e| e.positions.len() <= 2)
            });
        let Some(rings) = planar_ring(body, mesh, key, &plane, linear)
            .map(|ring| vec![ring])
            .or_else(|| {
                if undersampled_lens {
                    None
                } else {
                    refined_planar_ring(body, key, &plane, linear)
                }
            })
        else {
            continue;
        };
        if rings.is_empty() {
            mesh.missing_faces.retain(|candidate| *candidate != key);
            continue;
        }
        let mut points = Vec::new();
        let mut triangles = Vec::new();
        let mut complete = true;
        for ring in rings {
            let (p, t) = opencadkernel::geom2d::triangulate(&ring, &[]);
            if t.is_empty() {
                complete = false;
                break;
            }
            let offset = points.len();
            points.extend(p);
            triangles.extend(t.into_iter().map(|tri| tri.map(|i| i + offset)));
        }
        if !complete {
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

fn refined_planar_ring(
    body: &Body,
    face: opencadkernel::brep::topology::FaceKey,
    plane: &opencadkernel::space::Plane,
    linear: f64,
) -> Option<Vec<Vec<[f64; 2]>>> {
    use opencadkernel::geom2d::{Line, Tolerance, Vec2};
    if !body.face_coedges(face).iter().any(|key| {
        body.coedges
            .get(*key)
            .and_then(|c| body.edges.get(c.edge))
            .and_then(|e| body.curves.get(e.curve))
            .is_some_and(|c| !matches!(c, opencadkernel::brep::geometry::Curve3::Line(_)))
    }) {
        return None;
    }
    let mut chains = Vec::new();
    for key in body.face_coedges(face) {
        let coedge = body.coedges.get(key)?;
        let edge = body.edges.get(coedge.edge)?;
        let curve = body.curves.get(edge.curve)?;
        let mut count = 32;
        let positions = loop {
            let positions: Vec<_> = (0..=count)
                .map(|i| {
                    curve.point_at(
                        edge.start_parameter
                            + (edge.end_parameter - edge.start_parameter) * i as f64 / count as f64,
                    )
                })
                .collect();
            let fits = positions.windows(2).enumerate().all(|(i, pair)| {
                [0.25, 0.5, 0.75].into_iter().all(|f| {
                    let on = Vec3::from(curve.point_at(
                        edge.start_parameter
                            + (edge.end_parameter - edge.start_parameter) * (i as f64 + f)
                                / count as f64,
                    ));
                    on.distance(Vec3::from(pair[0]).lerp(Vec3::from(pair[1]), f)) <= linear * 0.25
                })
            });
            if fits {
                break positions;
            }
            if count >= 16384 {
                return None;
            }
            count *= 2;
        };
        let mut chain = Vec::new();
        for p in positions {
            let uv = plane.project(p)?;
            if Vec3::from(p).distance(Vec3::from(plane.point_at(uv))) > linear {
                return None;
            }
            chain.push(uv);
        }
        if !coedge.forward {
            chain.reverse();
        }
        chains.push(chain);
    }
    for i in 0..chains.len() {
        if Vec2::from(*chains[i].last()?).distance(Vec2::from(chains[(i + 1) % chains.len()][0]))
            > linear
        {
            return None;
        }
    }
    let ring: Vec<_> = chains
        .iter()
        .flat_map(|chain| chain[..chain.len() - 1].iter().copied())
        .collect();
    if let Some(polygon) =
        opencadkernel::geom2d::triangulate::polygon_frame(&ring, Tolerance::new(linear * 0.25))
    {
        return Some(vec![polygon.points]);
    }
    let distance = |p: [f64; 2], a: [f64; 2], b: [f64; 2]| {
        let p = Vec2::from(p);
        let a = Vec2::from(a);
        let b = Vec2::from(b);
        let d = b - a;
        let n = d.dot(d);
        if n == 0.0 {
            p.distance(a)
        } else {
            p.distance(a + d * ((p - a).dot(d) / n).clamp(0.0, 1.0))
        }
    };
    let retraces = chains.iter().enumerate().all(|(index, chain)| {
        chain.iter().all(|p| {
            chains.iter().enumerate().any(|(other, other_chain)| {
                index != other
                    && other_chain
                        .windows(2)
                        .any(|segment| distance(*p, segment[0], segment[1]) <= linear * 0.5)
            })
        })
    });
    if retraces {
        return Some(vec![]);
    }
    let lines: Vec<_> = ring
        .iter()
        .zip(ring.iter().cycle().skip(1))
        .take(ring.len())
        .map(|(a, b)| Line { start: *a, end: *b })
        .collect();
    let faces =
        opencadkernel::geom2d::arrangement::bounded_faces(&lines, Tolerance::new(linear * 0.25));
    // A curved boundary can cross itself where fitted intersection curves meet.
    // Split it into bounded regions and retain the original even-odd interior.

    let mut selected = Vec::new();
    for boundary in faces {
        let (vertices, triangles) = opencadkernel::geom2d::triangulate(&boundary, &[]);
        let triangle = triangles.first()?;
        let point =
            [0, 1].map(|axis| triangle.iter().map(|i| vertices[*i][axis]).sum::<f64>() / 3.0);
        let inside = ring
            .iter()
            .zip(ring.iter().cycle().skip(1))
            .take(ring.len())
            .fold(false, |inside, (a, b)| {
                inside
                    ^ ((a[1] > point[1]) != (b[1] > point[1])
                        && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0])
            });
        if inside {
            selected.push(boundary);
        }
    }
    if selected.is_empty() {
        return None;
    }
    // Preserve every boundary point, except a zero-width retraced spur.
    if !chains.iter().enumerate().all(|(index, chain)| {
        chain.iter().all(|p| {
            selected.iter().any(|boundary| {
                boundary
                    .iter()
                    .zip(boundary.iter().cycle().skip(1))
                    .take(boundary.len())
                    .any(|(a, b)| distance(*p, *a, *b) <= linear * 0.5)
            }) || chains.iter().enumerate().any(|(other, c)| {
                index != other
                    && c.windows(2)
                        .any(|pair| distance(*p, pair[0], pair[1]) <= linear * 0.5)
            })
        })
    }) {
        return None;
    }
    Some(selected)
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
    // Cancel nearly retraced planar slits before validating the remaining area.
    let mut index = 0;
    while ring.len() >= 3 && index < ring.len() {
        use opencadkernel::geom2d::Vec2;
        let n = ring.len();
        let a = Vec2::from(ring[(index + n - 1) % n]);
        let b = Vec2::from(ring[index]);
        let c = Vec2::from(ring[(index + 1) % n]);
        let incoming = a - b;
        let outgoing = c - b;
        let length = incoming.length().max(outgoing.length());
        if length > 0.
            && incoming.dot(outgoing) > 0.
            && incoming.cross(outgoing).abs() / length <= linear
        {
            ring.remove(index);
            index = 0;
        } else {
            index += 1;
        }
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
    use super::{tessellate_body, Vec3};
    use opencadkernel::brep::mesh::{tessellate, TessellationTolerance};

    #[test]
    fn meshes_periodic_rims_composed_of_multiple_edges() {
        let mut body = crate::test_shapes::bent_tube();
        let keys: Vec<_> = body
            .edge_keys()
            .filter(|key| {
                matches!(
                    body.curves.get(body.edges.get(*key).unwrap().curve),
                    Some(opencadkernel::brep::geometry::Curve3::Circle(_))
                )
            })
            .collect();
        for key in keys {
            opencadkernel::brep::split::split_edge(&mut body, key, std::f64::consts::PI).unwrap();
        }
        let face = body.face_keys().next().unwrap();
        for key in body.face_coedges(face) {
            body.coedges.get_mut(key).unwrap().pcurve = None;
        }
        let mesh = tessellate_body(&body, TessellationTolerance::new(0.15, 1e-6));
        assert!(mesh.is_complete(), "{:?}", mesh.missing_faces);
        let area = mesh.mesh.surface_area().unwrap();
        assert!(area > std::f64::consts::TAU * 0.4 * 3. && area < std::f64::consts::TAU * 0.4 * 4.);
    }

    #[test]
    fn recovers_all_lobes_of_a_curved_planar_boundary() {
        let body = crate::test_shapes::crossing_curved_patch();
        let mesh = tessellate_body(&body, TessellationTolerance::new(0.15, 1e-6));
        assert!(mesh.is_complete(), "{:?}", mesh.missing_faces);
        assert!((mesh.mesh.surface_area().unwrap() - 20.0 / 3.0).abs() < 1e-5);
        for triangle in &mesh.mesh.triangles {
            let [a, b, c] = triangle.map(|i| Vec3::from(mesh.mesh.positions[i]));
            assert!((b - a).cross(c - a).z > 0.0);
        }
    }

    #[test]
    fn discards_only_a_proven_microscopic_collapsed_trim() {
        for (size, periodic, expected) in [
            (1e-8, false, true),
            (0.1, false, false),
            (1e-8, true, false),
        ] {
            let body = crate::test_shapes::collapsed_nurbs_slit(size, periodic);
            let mut mesh = tessellate(&body, TessellationTolerance::new(0.15, 1e-6));
            mesh.missing_faces = body.face_keys().collect();
            super::repair_collapsed_slits(&body, &mut mesh, 1e-6);
            assert_eq!(mesh.missing_faces.is_empty(), expected);
            assert!(mesh.mesh.triangles.is_empty());
        }
    }

    #[test]
    fn meshes_a_periodic_tube_with_a_curved_seam() {
        let body = crate::test_shapes::bent_tube();
        let body = opencadkernel::brep::place::transform(
            &body,
            &opencadkernel::brep::place::Placement::at([100000., -200000., 300000.]),
        )
        .unwrap();
        let mesh = tessellate_body(&body, TessellationTolerance::new(0.15, 1e-6));
        assert!(mesh.is_complete());
        let area = mesh.mesh.surface_area().unwrap();
        assert!(area > std::f64::consts::TAU * 0.4 * 3. && area < std::f64::consts::TAU * 0.4 * 4.);
        assert!(mesh.mesh.triangles.len() < 20000);
        let face = body.face_keys().next().unwrap();
        let surface = body
            .surfaces
            .get(body.faces.get(face).unwrap().surface)
            .unwrap();
        for point in &mesh.mesh.positions {
            let (u, v) = surface.parameters_at(*point).unwrap();
            assert!(Vec3::from(*point).distance(Vec3::from(surface.point_at(u, v))) < 1e-6);
        }
    }

    #[test]
    fn horn_patch_preserves_area_near_a_translated_pole() {
        for origin in [[0.; 3], [100000., -200000., 300000.]] {
            let body = crate::test_shapes::horn_patch(origin);
            let mesh = tessellate_body(&body, TessellationTolerance::new(0.15, 1e-6));
            assert!(mesh.is_complete(), "{:?}", mesh.missing_faces);
            let area = mesh.mesh.surface_area().unwrap();
            let expected = 0.25_f64.powi(2) * 1.1 * (std::f64::consts::FRAC_PI_2 - 1.);
            assert!(
                (area - expected).abs() / expected < 0.02,
                "{area} / {expected}"
            );
            assert!(mesh.mesh.positions.iter().flatten().all(|v| v.is_finite()));
        }
    }

    #[test]
    fn cancels_only_a_planar_slit_within_linear_tolerance() {
        let body = crate::test_shapes::planar_slit(1e-8);
        let tolerance = TessellationTolerance::new(0.15, 1e-6);
        let mesh = tessellate_body(&body, tolerance);
        assert!(mesh.is_complete());
        assert!((mesh.mesh.surface_area().unwrap() - 12.).abs() < 1e-7);
        assert!(!tessellate_body(&crate::test_shapes::planar_slit(0.01), tolerance).is_complete());
    }

    #[test]
    fn refines_crossing_arc_chords_without_relaxing_tolerance() {
        let body = crate::test_shapes::curved_band();
        let tolerance = TessellationTolerance::new(0.15, 1e-6);
        assert!(!tessellate(&body, tolerance).is_complete());
        let repaired = tessellate_body(&body, tolerance);
        assert!(repaired.is_complete());
        let area: f64 = repaired
            .mesh
            .triangles
            .iter()
            .map(|t| {
                let [a, b, c] =
                    t.map(|i| opencadkernel::space::Vec3::from(repaired.mesh.positions[i]));
                let normal = (b - a).cross(c - a);
                assert!(normal.z > 0.);
                normal.length() / 2.
            })
            .sum();
        let exact = (1.0002_f64.powi(2) * std::f64::consts::PI
            - (std::f64::consts::PI - 0.14)
            - 2. * 1.0002 * 0.07_f64.sin())
            / 2.;
        assert!(
            (area - exact).abs() < exact * 0.05,
            "area={area} exact={exact}"
        );
        assert!(!tessellate(&body, tolerance).is_complete());
    }

    #[test]
    fn repairs_inconsistent_trim_parameters() {
        let body = crate::test_shapes::trimmed_box(1e-7);
        let tolerance = TessellationTolerance::new(0.15, 1e-6);
        let before = format!("{body:?}");
        let repaired = tessellate_body(&body, tolerance);
        assert!(repaired.is_complete());
        assert_eq!(before, format!("{body:?}"), "input must not be mutated");
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
