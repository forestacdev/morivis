//! Cutting topology apart without breaking it.
//!
//! Every modelling operation that adds detail ends here: a boolean splits the
//! faces its intersection curves cross, a fillet splits the edges it runs
//! along, and an imprint splits both. What they have in common is that the
//! result has to be as consistent as the input — a face split into two halves
//! that do not quite share their new edge is worse than one not split at all,
//! because it looks finished.
//!
//! So each operation here leaves [`Body::validate`] finding nothing, and the
//! tests check that rather than checking the pieces individually.
//!
//! # The part that is easy to forget
//!
//! An edge belongs to two faces. Splitting it changes the loop of the face
//! being worked on *and* the loop of the one on the other side, which is not
//! mentioned anywhere in the operation's own description and is exactly what
//! a first implementation misses. The far face's loop is then one coedge
//! short, its ring no longer closes, and the failure surfaces later as a
//! boolean that loses a wall.

use super::geometry::Curve3;
use super::pcurve;
use super::topology::{
    Body, Coedge, CoedgeKey, Edge, EdgeKey, Face, FaceKey, Loop, LoopKey, Vertex, VertexKey,
};
use super::Provenance;
use crate::geom2d::{distance_to, intersect as cross, Tolerance, Transform};
use crate::space::Vec3;
use std::f64::consts::TAU;

/// Splits an edge at a parameter along its curve, returning the two halves.
///
/// The first keeps the original key, so anything already pointing at the edge
/// still names its first half. The second is new.
///
/// Every coedge that used the edge is split in step, in whichever face it
/// belongs to — including the face on the far side, whose loop is just as
/// much a part of this operation as the near one's.
///
/// `None` when the parameter is at or outside the edge's own span: there is
/// nothing to divide, and creating a zero-length piece would leave topology
/// no later operation can make sense of.
pub fn split_edge(body: &mut Body, edge: EdgeKey, parameter: f64) -> Option<(EdgeKey, EdgeKey)> {
    let original = body.edges.get(edge)?.clone();
    let span = original.end_parameter - original.start_parameter;
    if span == 0.0 {
        return None;
    }
    // Measured as a fraction of the span so the guard means the same thing on
    // an edge parameterised over a unit and one parameterised over a turn.
    let across = (parameter - original.start_parameter) / span;
    if !(1e-9..=1.0 - 1e-9).contains(&across) {
        return None;
    }

    // Resolve every pcurve before changing the shared topology.
    let mut coedges = Vec::with_capacity(original.coedges.len());
    for key in &original.coedges {
        let existing = body.coedges.get(*key)?.clone();
        let (near_pcurve, far_pcurve) = match existing.pcurve.as_ref() {
            Some(curve) => {
                let at = if existing.forward { across } else { 1.0 - across };
                let (first, second) = split_pcurve(curve, at)?;
                if existing.forward {
                    (Some(first), Some(second))
                } else {
                    (Some(second), Some(first))
                }
            }
            None => (None, None),
        };
        body.loops
            .get(existing.owner)?
            .coedges
            .iter()
            .position(|candidate| candidate == key)?;
        coedges.push((*key, existing, near_pcurve, far_pcurve));
    }

    let point = body.curves.get(original.curve)?.point_at(parameter);
    let middle = body.vertices.insert(Vertex {
        point,
        provenance: Provenance::Synthesized,
    });

    let far = body.edges.insert(Edge {
        curve: original.curve,
        start_parameter: parameter,
        end_parameter: original.end_parameter,
        start: middle,
        end: original.end,
        coedges: Vec::new(),
        provenance: Provenance::Synthesized,
    });
    {
        let near = body.edges.get_mut(edge)?;
        near.end_parameter = parameter;
        near.end = middle;
        near.provenance.soil();
    }

    for (coedge, existing, near_pcurve, far_pcurve) in coedges {
        let twin = body.coedges.insert(Coedge {
            edge: far,
            forward: existing.forward,
            pcurve: far_pcurve,
            owner: existing.owner,
            provenance: Provenance::Synthesized,
        });
        body.edges.get_mut(far)?.coedges.push(twin);

        let ring = body.loops.get_mut(existing.owner)?;
        let at = ring.coedges.iter().position(|key| *key == coedge)?;
        // A coedge running with the curve meets the near half first, so the
        // far half follows it. One running against the curve meets the far
        // half first, so the new coedge goes in ahead of it.
        ring.coedges.insert(if existing.forward { at + 1 } else { at }, twin);
        ring.provenance.soil();

        let face = ring.owner;
        if let Some(face) = body.faces.get_mut(face) {
            face.provenance.soil();
        }
        if let Some(coedge) = body.coedges.get_mut(coedge) {
            coedge.pcurve = near_pcurve;
            coedge.provenance.soil();
        }
    }

    Some((edge, far))
}

fn split_pcurve(
    curve: &crate::geom2d::Curve,
    at: f64,
) -> Option<(crate::geom2d::Curve, crate::geom2d::Curve)> {
    use crate::geom2d::{Arc, Curve, EllipseArc, Line};
    Some(match curve {
        Curve::Line(line) => {
            let middle = [
                line.start[0] + (line.end[0] - line.start[0]) * at,
                line.start[1] + (line.end[1] - line.start[1]) * at,
            ];
            (
                Curve::Line(Line { start: line.start, end: middle }),
                Curve::Line(Line { start: middle, end: line.end }),
            )
        }
        Curve::Circle(circle) => {
            let middle = TAU * at;
            (
                Curve::Arc(Arc {
                    centre: circle.centre,
                    radius: circle.radius,
                    start_angle: 0.0,
                    end_angle: middle,
                }),
                Curve::Arc(Arc {
                    centre: circle.centre,
                    radius: circle.radius,
                    start_angle: middle,
                    end_angle: TAU,
                }),
            )
        }
        Curve::Arc(arc) => {
            let end = arc.start_angle + arc.sweep();
            let middle = arc.start_angle + arc.sweep() * at;
            (
                Curve::Arc(Arc {
                    end_angle: middle,
                    ..*arc
                }),
                Curve::Arc(Arc {
                    start_angle: middle,
                    end_angle: end,
                    ..*arc
                }),
            )
        }
        Curve::Ellipse(arc) => {
            let end = arc.start_parameter + arc.sweep();
            let middle = arc.start_parameter + arc.sweep() * at;
            (
                Curve::Ellipse(EllipseArc {
                    end_parameter: middle,
                    ..*arc
                }),
                Curve::Ellipse(EllipseArc {
                    start_parameter: middle,
                    end_parameter: end,
                    ..*arc
                }),
            )
        }
        Curve::Nurbs(curve) => {
            let (first, second) = curve.split_at(at)?;
            (Curve::Nurbs(first), Curve::Nurbs(second))
        }
        _ => return None,
    })
}

/// Splits an edge at the point on it nearest `point`.
///
/// The form a caller with an intersection result has: it knows where the
/// curves met, not what parameter that was.
pub fn split_edge_at(body: &mut Body, edge: EdgeKey, point: [f64; 3]) -> Option<(EdgeKey, EdgeKey)> {
    let parameter = {
        let node = body.edges.get(edge)?;
        parameter_in_span(
            body.curves.get(node.curve)?,
            point,
            node.start_parameter,
            node.end_parameter,
        )
    };
    split_edge(body, edge, parameter)
}


/// Cuts a face in two along `cutter`, returning both halves.
///
/// The first keeps the original key. Both lie on the same surface — a cut
/// divides a face without moving it — and both belong to the same shell.
///
/// Handles boundary crossings, closed interior cuts, and closed sections of
/// periodic faces. Returns `None` when the cut cannot be represented exactly.
/// Crossings are solved in the surface's parameter space.
pub fn split_face(
    body: &mut Body,
    face: FaceKey,
    cutter: &Curve3,
    tolerance: f64,
) -> Option<[FaceKey; 2]> {
    let mut candidate = body.clone();
    let result = split_face_in_place(&mut candidate, face, cutter, tolerance)?;
    *body = candidate;
    Some(result)
}

fn split_face_in_place(
    body: &mut Body,
    face: FaceKey,
    cutter: &Curve3,
    tolerance: f64,
) -> Option<[FaceKey; 2]> {
    let node = body.faces.get(face)?.clone();
    let surface = body.surfaces.get(node.surface)?.clone();
    let flat_cutter = pcurve::project(&surface, cutter, tolerance)?;
    if matches!(surface, super::geometry::Surface::Sphere(_)) {
        if let Some(result) =
            split_full_sphere(body, face, &node, &surface, cutter, &flat_cutter)
        {
            return Some(result);
        }
    }
    let boundary_parts = pcurve::face_boundary_parts(body, face, tolerance)?;
    let original_boundary: Vec<_> = boundary_parts
        .iter()
        .map(|(_, curve)| curve.clone())
        .collect();
    let periods = pcurve::periods(&surface);

    // Where the cut meets the boundary, as points in space.
    let mut landings: Vec<Landing> = Vec::new();
    // Two circles on one sphere cross where the line their planes share
    // pierces it. Solved there exactly rather than between the sampled
    // chains their parameter-space images are, which only come near.
    let sphere_circle = match (&surface, cutter) {
        (super::geometry::Surface::Sphere(sphere), Curve3::Circle(circle)) => {
            Some((sphere, circle))
        }
        _ => None,
    };
    // Boxes in (u, v), so a copy of the cutter a turn away, or an edge
    // nowhere near it, is passed over without the crossing search.
    let piece_boxes: Vec<Option<[[f64; 2]; 2]>> =
        boundary_parts.iter().map(|(_, piece)| uv_box(piece)).collect();
    let mut crossings_of = |shifted_cutter: Option<&crate::geom2d::Curve>| -> Option<()> {
        let cutter_box = shifted_cutter.and_then(uv_box);
        for (coedge, flat_edge) in &boundary_parts {
            let edge_key = body.coedges.get(*coedge)?.edge;
            let edge = body.edges.get(edge_key)?.clone();
            let curve = body.curves.get(edge.curve)?.clone();
            // An edge on the cutter's own curve is where an earlier cut
            // already ran; it has no crossing to give, and sampling two
            // copies of one curve against each other never settles.
            if same_circle(cutter, &curve, tolerance) || curve == *cutter {
                continue;
            }
            let points: Vec<[f64; 3]> = match (shifted_cutter, sphere_circle, &curve) {
                (None, Some((sphere, circle)), Curve3::Circle(rim)) => {
                    circles_meet_on_sphere(sphere, circle, rim, tolerance)
                }
                (Some(_), Some(_), Curve3::Circle(_)) | (None, _, _) => continue,
                (Some(shifted_cutter), _, _) => {
                    let index = boundary_parts.iter().position(|(key, _)| key == coedge)?;
                    if let (Some(one), Some(other)) = (cutter_box, piece_boxes[index]) {
                        if one[1][0] < other[0][0]
                            || other[1][0] < one[0][0]
                            || one[1][1] < other[0][1]
                            || other[1][1] < one[0][1]
                        {
                            continue;
                        }
                    }
                    cross(shifted_cutter, flat_edge, Tolerance::new(tolerance))
                        .into_iter()
                        .map(|crossing| surface.point_at(crossing.point[0], crossing.point[1]))
                        .collect()
                }
            };
            for point in points {
                let along = parameter_in_span(
                    &curve,
                    point,
                    edge.start_parameter,
                    edge.end_parameter,
                );
                // The boundary pcurve may run past the edge it came from — a
                // straight edge projects to an infinite line, so a crossing
                // off the edge's own span is not on the boundary at all.
                let (low, high) = (
                    edge.start_parameter.min(edge.end_parameter),
                    edge.start_parameter.max(edge.end_parameter),
                );
                let slack = (high - low).abs() * 1e-9;
                if along < low - slack || along > high + slack {
                    continue;
                }
                if landings.iter().any(|seen| {
                    Vec3::from(seen.point).distance(Vec3::from(point)) <= tolerance
                        && (seen.edge != edge_key || seen.coedge == *coedge)
                })
                {
                    continue;
                }
                landings.push(Landing {
                    edge: edge_key,
                    coedge: *coedge,
                    point,
                });
            }
        }
        Some(())
    };
    crossings_of(None)?;
    for shifted_cutter in periodic_images(&flat_cutter, periods) {
        crossings_of(Some(&shifted_cutter))?;
    }
    // A spline that meets the boundary only by touching it — a fillet's
    // curve running into the wall it blends into, both on a third surface —
    // crosses nothing a walk can find, yet passes through a corner the
    // boundary already has. The corner is the landing.
    if matches!(cutter, Curve3::Nurbs(_)) {
        for (coedge, _) in &boundary_parts {
            let Some((vertex, _)) = body.coedge_vertices(*coedge) else {
                continue;
            };
            let Some(point) = body.vertices.get(vertex).map(|vertex| vertex.point) else {
                continue;
            };
            let gap = Vec3::from(cutter.point_at(cutter.parameter_at(point)))
                .distance(Vec3::from(point));
            let seen = landings
                .iter()
                .any(|landing| Vec3::from(landing.point).distance(Vec3::from(point)) <= tolerance);
            if gap <= tolerance * 10.0 && !seen {
                let edge = body.coedges.get(*coedge)?.edge;
                landings.push(Landing { edge, coedge: *coedge, point });
            }
        }
    }
    // A spline's fit: a thousandth of the spline, however short the stretch
    // being cut — two copies of one curve part a hair apart along all of it.
    let spline_size = match cutter {
        Curve3::Nurbs(spline) => {
            let (start, end) = spline.domain();
            let samples: Vec<Vec3> = (0..=16)
                .map(|step| {
                    Vec3::from(cutter.point_at(start + (end - start) * step as f64 / 16.0))
                })
                .collect();
            samples.iter().map(|point| point.distance(samples[0])).fold(0.0, f64::max)
        }
        _ => 0.0,
    };
    let fit_over = |from: f64, to: f64| {
        let chord = Vec3::from(cutter.point_at(from)).distance(Vec3::from(cutter.point_at(to)));
        tolerance.max(1e-3 * chord.max(spline_size))
    };
    let inside = |parameter: f64| {
        let (u, v) = surface.parameters_at(cutter.point_at(parameter))?;
        Some(periodic_points([u, v], periods).into_iter().any(|point| {
            pcurve::contains_parameter(
                &surface,
                &original_boundary,
                point,
                Tolerance::new(tolerance),
            )
        }))
    };
    let strictly_inside = |parameter: f64| {
        let (u, v) = surface.parameters_at(cutter.point_at(parameter))?;
        Some(periodic_points([u, v], periods).into_iter().any(|point| {
            pcurve::contains_parameter(
                &surface,
                &original_boundary,
                point,
                Tolerance::new(tolerance),
            ) && original_boundary
                .iter()
                .all(|edge| distance_to(edge, point) > tolerance)
        }))
    };
    if matches!(surface, super::geometry::Surface::Plane(_)) {
        if let Some(period) = closed_period(cutter) {
            let step = period * 1.0e-6;
            landings.retain(|landing| {
                let parameter = cutter.parameter_at(landing.point);
                matches!(
                    (inside(parameter - step), inside(parameter + step)),
                    (Some(before), Some(after)) if before != after
                )
            });
        }
    }
    if landings.is_empty() {
        let period = closed_period(cutter)?;
        // A closed cutter crossing no edge is wholly inside the face or
        // wholly out of it; out of it, nothing more needs asking.
        if inside(0.0) == Some(false) && inside(period * 0.5) == Some(false) {
            return None;
        }
        // A closed cutter that already is one of the face's edges was cut
        // before: the landings skip it as their own curve, and cutting
        // between the loops again peeled a sliver off the same band for ever
        // (#1563).
        let already_cut = boundary_parts.iter().any(|(coedge, _)| {
            body.coedges
                .get(*coedge)
                .and_then(|coedge| body.edges.get(coedge.edge))
                .and_then(|edge| body.curves.get(edge.curve))
                .is_some_and(|curve| same_circle(cutter, curve, tolerance) || curve == cutter)
        });
        if already_cut {
            return None;
        }
        // Loops the cutter closes round go with the island it cuts out. On a
        // band the cutter is straight and runs between the loops; on a plane
        // it is a closed curve, and an annulus cut by a circle between its
        // rims keeps one rim on each side (#1563's collar under a washer).
        let mut enclosed = Vec::new();
        if node.loops.len() > 1 {
            if !matches!(surface, super::geometry::Surface::Plane(_))
                || matches!(flat_cutter, crate::geom2d::Curve::Line(_))
            {
                return split_closed_between_loops(
                    body,
                    face,
                    &node,
                    &surface,
                    cutter,
                    &flat_cutter,
                    &boundary_parts,
                    period,
                );
            }
            for ring in &node.loops {
                let first = *body.loops.get(*ring)?.coedges.first()?;
                let boundary = &boundary_parts.iter().find(|(key, _)| *key == first)?.1;
                if crate::geom2d::contains(
                    std::slice::from_ref(&flat_cutter),
                    boundary.point_at(0.5),
                    Tolerance::new(tolerance),
                ) {
                    enclosed.push(*ring);
                }
            }
        }
        let start_parameter = (0..16)
            .map(|index| period * index as f64 / 16.0)
            .find(|parameter| strictly_inside(*parameter) == Some(true))?;
        let point = cutter.point_at(start_parameter);
        let (u, v) = surface.parameters_at(point)?;
        let strictly_inside = periodic_points([u, v], periods).into_iter().any(|point| {
            crate::geom2d::contains(
                &original_boundary,
                point,
                Tolerance::new(tolerance),
            ) && original_boundary
                .iter()
                .all(|edge| distance_to(edge, point) > tolerance)
        });
        if !strictly_inside {
            return None;
        }

        // A closed cutter carries its own plane orientation. Surface/face
        // sense alone says nothing about which way increasing its parameter
        // winds: intersection circles can use the opposite plane normal.
        // The island follows the face and the new hole runs the other way.
        let (cutter_plane, winding) = match cutter {
            Curve3::Circle(circle) => (&circle.plane, 1.0),
            Curve3::Ellipse(ellipse) => (&ellipse.plane, 1.0),
            Curve3::PlanarSpline { plane, curve } => {
                (plane, crate::geom2d::Curve::Nurbs(curve.clone()).enclosed_area())
            }
            _ => return None,
        };
        let alignment = Vec3::from(cutter_plane.normal()?)
            .dot(Vec3::from(surface.normal_at(u, v)?)) * winding;
        if !alignment.is_finite() || alignment == 0.0 {
            return None;
        }
        let island_forward = (alignment > 0.0) == node.forward;

        let seam = body.vertices.insert(Vertex {
            point,
            provenance: Provenance::Synthesized,
        });
        let curve = body.curves.insert(cutter.clone());
        let cut = body.edges.insert(Edge {
            curve,
            start_parameter,
            end_parameter: start_parameter + period,
            start: seam,
            end: seam,
            coedges: Vec::new(),
            provenance: Provenance::Synthesized,
        });

        let hole_ring = body.loops.insert(Loop {
            coedges: Vec::new(),
            owner: face,
            provenance: Provenance::Synthesized,
        });
        let hole = body.coedges.insert(Coedge {
            edge: cut,
            forward: !island_forward,
            pcurve: None,
            owner: hole_ring,
            provenance: Provenance::Synthesized,
        });
        body.loops.get_mut(hole_ring)?.coedges = vec![hole];
        let kept = body.faces.get_mut(face)?;
        kept.loops.push(hole_ring);
        kept.provenance.soil();

        let other = body.faces.insert(Face {
            surface: node.surface,
            forward: node.forward,
            loops: Vec::new(),
            owner: node.owner,
            provenance: Provenance::Synthesized,
        });
        let other_ring = body.loops.insert(Loop {
            coedges: Vec::new(),
            owner: other,
            provenance: Provenance::Synthesized,
        });
        let inner = body.coedges.insert(Coedge {
            edge: cut,
            forward: island_forward,
            pcurve: None,
            owner: other_ring,
            provenance: Provenance::Synthesized,
        });
        body.loops.get_mut(other_ring)?.coedges = vec![inner];
        body.faces.get_mut(face)?.loops.retain(|ring| !enclosed.contains(ring));
        for ring in &enclosed {
            body.loops.get_mut(*ring)?.owner = other;
        }
        body.faces.get_mut(other)?.loops =
            std::iter::once(other_ring).chain(enclosed.iter().copied()).collect();
        body.shells.get_mut(node.owner)?.faces.push(other);
        body.edges.get_mut(cut)?.coedges = vec![hole, inner];
        return Some([face, other]);
    }
    let mut selected_span = None;
    if landings.len() > 2 {
        // Split one interior span; the caller retries both resulting faces.
        landings.sort_by(|a, b| {
            cutter
                .parameter_at(a.point)
                .total_cmp(&cutter.parameter_at(b.point))
        });
        let period = closed_period(cutter);
        let count = landings.len();
        let pair_count = if period.is_some() { count } else { count - 1 };
        let pair = (0..pair_count).find_map(|index| {
            let next = (index + 1) % count;
            let first = cutter.parameter_at(landings[index].point);
            let mut second = cutter.parameter_at(landings[next].point);
            if next == 0 {
                second += period?;
            }
            // A span along an edge already there — a cut made on an earlier
            // pass — is not inside, however the walk of it reads.
            let middle = 0.5 * (first + second);
            let along_boundary = on_boundary(
                body,
                &boundary_parts,
                cutter,
                cutter.point_at(middle),
                fit_over(first, second),
                tolerance,
            );
            (strictly_inside(middle)? && !along_boundary)
                .then_some((
                    [landings[index].clone(), landings[next].clone()],
                    (first, second),
                ))
        });
        let (pair, span) = pair?;
        landings = pair.to_vec();
        selected_span = Some(span);
    }
    if landings.len() != 2 {
        return None;
    }

    let same_vertex_landing = Vec3::from(landings[0].point)
        .distance(Vec3::from(landings[1].point))
        <= tolerance;
    let first_parameter = cutter.parameter_at(landings[0].point);
    let second_parameter = cutter.parameter_at(landings[1].point);
    let (low, high, low_parameter, high_parameter) =
        if first_parameter <= second_parameter {
            (0, 1, first_parameter, second_parameter)
        } else {
            (1, 0, second_parameter, first_parameter)
        };
    let (start_landing, end_landing, start_parameter, end_parameter) = match (
        selected_span,
        closed_period(cutter),
    ) {
        (Some((start, end)), _) => (0, 1, start, end),
        (None, Some(period)) if same_vertex_landing => {
            (low, high, low_parameter, low_parameter + period)
        }
        (None, Some(period)) => {
            // A half already cut along is boundary now, not inside.
            let open = |from: f64, to: f64| -> Option<bool> {
                let parameter = 0.5 * (from + to);
                let along = on_boundary(
                    body,
                    &boundary_parts,
                    cutter,
                    cutter.point_at(parameter),
                    fit_over(from, to),
                    tolerance,
                );
                Some(inside(parameter)? && !along)
            };
            let direct = open(low_parameter, high_parameter)?;
            let wrapped = open(high_parameter, low_parameter + period)?;
            match (direct, wrapped) {
                // A loop through two corners with both halves inside cuts
                // the face in three; one half now, the other on the retry.
                (true, _) => (low, high, low_parameter, high_parameter),
                (false, true) => (high, low, high_parameter, low_parameter + period),
                (false, false) => return None,
            }
        }
        // Two landings on the boundary bound a stretch that may run through
        // a hole of the face rather than across it.
        (None, None) => {
            // An open cutter landing twice on one corner spans nothing.
            if same_vertex_landing || !inside(0.5 * (low_parameter + high_parameter))? {
                return None;
            }
            (low, high, low_parameter, high_parameter)
        }
    };

    // However the containment tests read, a cut cannot run far outside the
    // face it divides: one that does has gone the long way round a closed
    // cutter, across the rest of the surface.
    {
        let mut low = Vec3::new(f64::INFINITY, f64::INFINITY, f64::INFINITY);
        let mut high = Vec3::new(f64::NEG_INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY);
        for (coedge, _) in &boundary_parts {
            let Some(edge) =
                body.coedges.get(*coedge).and_then(|coedge| body.edges.get(coedge.edge))
            else {
                continue;
            };
            let Some(curve) = body.curves.get(edge.curve) else {
                continue;
            };
            for step in 0..=8 {
                let t = edge.start_parameter
                    + (edge.end_parameter - edge.start_parameter) * step as f64 / 8.0;
                let p = Vec3::from(curve.point_at(t));
                low = Vec3::new(low.x.min(p.x), low.y.min(p.y), low.z.min(p.z));
                high = Vec3::new(high.x.max(p.x), high.y.max(p.y), high.z.max(p.z));
            }
        }
        if low.is_finite() && high.is_finite() {
            let pad = low.distance(high) + tolerance * 10.0;
            let outside = (0..=8).any(|step| {
                let t = start_parameter + (end_parameter - start_parameter) * step as f64 / 8.0;
                let p = Vec3::from(cutter.point_at(t));
                p.x < low.x - pad
                    || p.y < low.y - pad
                    || p.z < low.z - pad
                    || p.x > high.x + pad
                    || p.y > high.y + pad
                    || p.z > high.z + pad
            });
            if outside {
                return None;
            }
        }
    }

    // An open cut that ends where it starts encloses nothing.
    if closed_period(cutter).is_none()
        && Vec3::from(cutter.point_at(start_parameter))
            .distance(Vec3::from(cutter.point_at(end_parameter)))
            <= tolerance
    {
        return None;
    }

    // A cut that runs along the boundary divides nothing. It happens
    // naturally the moment a face has already been cut: the new edge lies on
    // the cutter, its two ends are vertices, and the next pass finds the same
    // two landings and cuts again — the same face for ever. Asked of the
    // midpoint rather than the ends, since a genuine cut also touches the
    // boundary at both of those.
    // Asked of the edges' own curves too: a sampled boundary image sits off
    // its edge by more than the tolerance between samples.
    let midway = cutter.point_at(0.5 * (start_parameter + end_parameter));
    let (u, v) = surface.parameters_at(midway)?;
    if periodic_points([u, v], periods).into_iter().any(|point| {
        original_boundary
            .iter()
            .any(|edge| distance_to(edge, point) <= tolerance)
    }) || on_boundary(
        body,
        &boundary_parts,
        cutter,
        midway,
        fit_over(start_parameter, end_parameter),
        tolerance,
    ) {
        return None;
    }

    let ring_of = |landing: &Landing| body.coedges.get(landing.coedge).map(|coedge| coedge.owner);
    let (first_ring, second_ring) = (ring_of(&landings[0])?, ring_of(&landings[1])?);

    // Mutate the boundary only after proving this is a new cut.
    let first = vertex_at(body, &landings[0], tolerance)?;
    let second = vertex_at(body, &landings[1], tolerance)?;
    if first == second && !same_vertex_landing {
        return None;
    }
    // An edge of the face already joining the two corners the same way is
    // this cut made before — by a copy of the cutter a hair off, say — and
    // cutting again only peels a sliver off between the two.
    if first != second {
        let midway = Vec3::from(cutter.point_at(0.5 * (start_parameter + end_parameter)));
        let fit = fit_over(start_parameter, end_parameter);
        let repeated = body.face_coedges(face).iter().any(|coedge| {
            let Some(edge) =
                body.coedges.get(*coedge).and_then(|coedge| body.edges.get(coedge.edge))
            else {
                return false;
            };
            let joins = (edge.start == first && edge.end == second)
                || (edge.start == second && edge.end == first);
            joins
                && body.curves.get(edge.curve).is_some_and(|curve| {
                    let middle =
                        curve.point_at(0.5 * (edge.start_parameter + edge.end_parameter));
                    Vec3::from(middle).distance(midway) <= fit
                })
        });
        if repeated {
            return None;
        }
    }
    let ends = [first, second];
    let (start, end) = (ends[start_landing], ends[end_landing]);

    // The new edge, running along the cut between them.
    let curve = body.curves.insert(cutter.clone());
    let cut = body.edges.insert(Edge {
        curve,
        start_parameter,
        end_parameter,
        start,
        end,
        coedges: Vec::new(),
        provenance: Provenance::Synthesized,
    });

    // A cut from one loop to another divides nothing yet: it joins them, a
    // band's two rims or a hole and the outer boundary, into one loop that
    // runs round the first, along the cut, round the second and back. The
    // next cut across the face divides it as it would any one-loop face.
    if first_ring != second_ring {
        let from_corner = |body: &Body, ring: LoopKey, vertex: VertexKey| {
            let coedges = body.loops.get(ring)?.coedges.clone();
            let at = coedges.iter().position(|coedge| {
                body.coedge_vertices(*coedge).is_some_and(|(from, _)| from == vertex)
            })?;
            Some([&coedges[at..], &coedges[..at]].concat())
        };
        let around_first = from_corner(body, first_ring, first)?;
        let around_second = from_corner(body, second_ring, second)?;
        let across = body.coedges.insert(Coedge {
            edge: cut,
            forward: start == first,
            pcurve: None,
            owner: first_ring,
            provenance: Provenance::Synthesized,
        });
        let back = body.coedges.insert(Coedge {
            edge: cut,
            forward: start == second,
            pcurve: None,
            owner: first_ring,
            provenance: Provenance::Synthesized,
        });
        body.edges.get_mut(cut)?.coedges = vec![across, back];
        for coedge in &around_second {
            body.coedges.get_mut(*coedge)?.owner = first_ring;
        }
        let mut joined = around_first;
        joined.push(across);
        joined.extend(around_second);
        joined.push(back);
        let ring = body.loops.get_mut(first_ring)?;
        ring.coedges = joined;
        ring.provenance.soil();
        body.loops.remove(second_ring);
        let joined_face = body.faces.get_mut(face)?;
        joined_face.loops.retain(|ring| *ring != second_ring);
        joined_face.provenance.soil();
        return Some([face, face]);
    }
    let ring_key = first_ring;

    // The boundary, now split at both ends of the cut, divides into the two
    // arcs between them.
    let ring = body.loops.get(ring_key)?.coedges.clone();
    let begins_at = |body: &Body, coedge: CoedgeKey, vertex: VertexKey| {
        body.coedge_vertices(coedge)
            .is_some_and(|(from, _)| from == vertex)
    };
    let landing_index = |landing: &Landing, vertex: VertexKey| {
        let at = ring.iter().position(|coedge| *coedge == landing.coedge)?;
        if begins_at(body, ring[at], vertex) {
            return Some(at);
        }
        let next = (at + 1) % ring.len();
        if begins_at(body, ring[next], vertex) {
            return Some(next);
        }
        // Both ends landed on one edge, and splitting it at the first moved
        // the second onto a piece further round.
        ring.iter().position(|coedge| begins_at(body, *coedge, vertex))
    };
    let at_first = landing_index(&landings[0], first)?;
    let at_second = landing_index(&landings[1], second)?;
    // The stretch of the ring from one index round to the other, not
    // including where it stops.
    let arc = |from: usize, to: usize| -> Vec<CoedgeKey> {
        let count = ring.len();
        let mut out = Vec::new();
        let mut index = from;
        while index != to {
            out.push(ring[index]);
            index = (index + 1) % count;
        }
        out
    };
    let near = arc(at_first, at_second);
    let far = arc(at_second, at_first);
    if near.is_empty() || far.is_empty() {
        return None;
    }

    // Each arc is closed by the cut, traversed whichever way takes it back to
    // where the arc began. The two therefore run it opposite ways, which is
    // what makes the new edge a shared one rather than two coincident walls.
    let sense = |from: VertexKey| start == from;
    // A cut starting and ending at one vertex gives no ends to go by; the
    // near arc has to be on the face's side of the cut instead.
    let near_forward = if same_vertex_landing {
        near_side_forward(body, &surface, cutter, start_parameter, &near, node.forward)?
    } else {
        sense(second)
    };
    let near_closer = body.coedges.insert(Coedge {
        edge: cut,
        forward: near_forward,
        pcurve: None,
        owner: ring_key,
        provenance: Provenance::Synthesized,
    });
    let mut kept = near;
    kept.push(near_closer);
    {
        let ring = body.loops.get_mut(ring_key)?;
        ring.coedges = kept;
        ring.provenance.soil();
    }
    body.edges.get_mut(cut)?.coedges.push(near_closer);
    if let Some(face) = body.faces.get_mut(face) {
        face.provenance.soil();
    }

    // The far arc moves onto a new face on the same surface, in the same
    // shell.
    let other = body.faces.insert(Face {
        surface: node.surface,
        forward: node.forward,
        loops: Vec::new(),
        owner: node.owner,
        provenance: Provenance::Synthesized,
    });
    let other_ring = body.loops.insert(Loop {
        coedges: Vec::new(),
        owner: other,
        provenance: Provenance::Synthesized,
    });
    let far_closer = body.coedges.insert(Coedge {
        edge: cut,
        forward: if same_vertex_landing { !near_forward } else { sense(first) },
        pcurve: None,
        owner: other_ring,
        provenance: Provenance::Synthesized,
    });
    body.edges.get_mut(cut)?.coedges.push(far_closer);
    for coedge in &far {
        body.coedges.get_mut(*coedge)?.owner = other_ring;
    }
    let mut moved = far;
    moved.push(far_closer);
    body.loops.get_mut(other_ring)?.coedges = moved;
    body.faces.get_mut(other)?.loops = vec![other_ring];
    body.shells.get_mut(node.owner)?.faces.push(other);

    // The face's other loops — its holes, a band's far rim — go with
    // whichever half they lie in. A loop neither half's own boundary closes
    // round belongs to the half that wraps round the surface with it.
    let extras: Vec<(LoopKey, [f64; 2])> = node
        .loops
        .iter()
        .filter(|ring| **ring != ring_key)
        .map(|ring| {
            let first = *body.loops.get(*ring)?.coedges.first()?;
            let piece = &boundary_parts.iter().find(|(key, _)| *key == first)?.1;
            Some((*ring, piece.point_at(0.5)))
        })
        .collect::<Option<_>>()?;
    if !extras.is_empty() {
        body.faces.get_mut(face)?.loops = vec![ring_key];
        let near_boundary = pcurve::face_boundary(body, face, tolerance)?;
        let far_boundary = pcurve::face_boundary(body, other, tolerance)?;
        let turn = periods[0].unwrap_or(f64::INFINITY);
        let wraps = |boundary: &[crate::geom2d::Curve]| {
            let (Some(first), Some(last)) = (boundary.first(), boundary.last()) else {
                return false;
            };
            let (start, end) = (first.point_at(0.0), last.point_at(1.0));
            (start[0] - end[0]).hypot(start[1] - end[1]) > turn * 0.5
        };
        let inside = |boundary: &[crate::geom2d::Curve], point: [f64; 2]| {
            pcurve::contains_parameter(&surface, boundary, point, Tolerance::new(tolerance))
        };
        // Cut off a hole, the cap between the cut and the hole's edge winds
        // against the hole, and the rest still winds with it: that rest keeps
        // whatever neither half closes round.
        let winding = |boundary: &[crate::geom2d::Curve]| -> f64 {
            let points: Vec<[f64; 2]> = boundary
                .iter()
                .flat_map(|curve| (0..8).map(move |step| curve.point_at(step as f64 / 8.0)))
                .collect();
            (0..points.len())
                .map(|index| {
                    let (a, b) = (points[index], points[(index + 1) % points.len()]);
                    a[0] * b[1] - b[0] * a[1]
                })
                .sum()
        };
        let original: Vec<crate::geom2d::Curve> = boundary_parts
            .iter()
            .filter(|(coedge, _)| ring.contains(coedge))
            .map(|(_, curve)| curve.clone())
            .collect();
        let far_keeps = if wraps(&near_boundary) != wraps(&far_boundary) {
            wraps(&far_boundary)
        } else {
            let sense = winding(&original).signum();
            winding(&far_boundary).signum() == sense && winding(&near_boundary).signum() != sense
        };
        let mut kept_loops = vec![ring_key];
        let mut moved_loops = vec![other_ring];
        for (ring, point) in extras {
            let to_far = match (inside(&near_boundary, point), inside(&far_boundary, point)) {
                (false, true) => true,
                (true, false) => false,
                _ => far_keeps,
            };
            if to_far {
                body.loops.get_mut(ring)?.owner = other;
                moved_loops.push(ring);
            } else {
                kept_loops.push(ring);
            }
        }
        body.faces.get_mut(face)?.loops = kept_loops;
        body.faces.get_mut(other)?.loops = moved_loops;
    }

    Some([face, other])
}

/// Split an untrimmed one-face sphere without routing the cut through its
/// artificial pole-to-pole seam. The seam is only a parameterisation aid; a
/// real closed section leaves two spherical faces bounded by the section.
fn split_full_sphere(
    body: &mut Body,
    face: FaceKey,
    node: &Face,
    surface: &super::geometry::Surface,
    cutter: &Curve3,
    flat_cutter: &crate::geom2d::Curve,
) -> Option<[FaceKey; 2]> {
    let period = closed_period(cutter)?;
    if node.loops.len() != 1 {
        return None;
    }
    let old_loop = node.loops[0];
    let old_coedges = body.loops.get(old_loop)?.coedges.clone();
    if old_coedges.len() != 2 {
        return None;
    }
    let first = body.coedges.get(old_coedges[0])?;
    let second = body.coedges.get(old_coedges[1])?;
    if first.edge != second.edge || first.forward == second.forward {
        return None;
    }

    let (start_parameter, point, alignment) = (0..32).find_map(|index| {
        let parameter = period * index as f64 / 32.0;
        let point = cutter.point_at(parameter);
        let (u, v) = surface.parameters_at(point)?;
        let plane = match cutter {
            Curve3::Circle(circle) => &circle.plane,
            Curve3::Ellipse(ellipse) => &ellipse.plane,
            Curve3::PlanarSpline { plane, .. } => plane,
            _ => return None,
        };
        let alignment = Vec3::from(plane.normal()?)
            .dot(Vec3::from(surface.normal_at(u, v)?));
        (alignment.is_finite() && alignment != 0.0).then_some((parameter, point, alignment))
    })?;
    let first_forward = (alignment > 0.0) == node.forward;

    let old_edge = first.edge;
    for coedge in old_coedges {
        body.coedges.remove(coedge);
    }
    body.loops.remove(old_loop);
    body.edges.remove(old_edge);

    let seam = body.vertices.insert(Vertex {
        point,
        provenance: Provenance::Synthesized,
    });
    let curve = body.curves.insert(cutter.clone());
    let cut = body.edges.insert(Edge {
        curve,
        start_parameter,
        end_parameter: start_parameter + period,
        start: seam,
        end: seam,
        coedges: Vec::new(),
        provenance: Provenance::Synthesized,
    });

    let first_loop = body.loops.insert(Loop {
        coedges: Vec::new(),
        owner: face,
        provenance: Provenance::Synthesized,
    });
    let first_pcurve = if first_forward {
        flat_cutter.clone()
    } else {
        reverse_closed_pcurve(flat_cutter)?
    };
    let first_coedge = body.coedges.insert(Coedge {
        edge: cut,
        forward: first_forward,
        pcurve: Some(first_pcurve),
        owner: first_loop,
        provenance: Provenance::Synthesized,
    });
    body.loops.get_mut(first_loop)?.coedges = vec![first_coedge];
    let kept = body.faces.get_mut(face)?;
    kept.loops = vec![first_loop];
    kept.provenance.soil();

    let other = body.faces.insert(Face {
        surface: node.surface,
        forward: node.forward,
        loops: Vec::new(),
        owner: node.owner,
        provenance: Provenance::Synthesized,
    });
    let other_loop = body.loops.insert(Loop {
        coedges: Vec::new(),
        owner: other,
        provenance: Provenance::Synthesized,
    });
    let other_forward = !first_forward;
    let other_pcurve = if other_forward {
        flat_cutter.clone()
    } else {
        reverse_closed_pcurve(flat_cutter)?
    };
    let other_coedge = body.coedges.insert(Coedge {
        edge: cut,
        forward: other_forward,
        pcurve: Some(other_pcurve),
        owner: other_loop,
        provenance: Provenance::Synthesized,
    });
    body.loops.get_mut(other_loop)?.coedges = vec![other_coedge];
    body.faces.get_mut(other)?.loops = vec![other_loop];
    body.shells.get_mut(node.owner)?.faces.push(other);
    body.edges.get_mut(cut)?.coedges = vec![first_coedge, other_coedge];
    body.validate().is_empty().then_some([face, other])
}

pub(super) fn reverse_closed_pcurve(curve: &crate::geom2d::Curve) -> Option<crate::geom2d::Curve> {
    use crate::geom2d::{Curve, Line, Polyline};
    Some(match curve {
        Curve::Line(line) => Curve::Line(Line {
            start: line.end,
            end: line.start,
        }),
        Curve::Polyline(polyline)
            if polyline
                .vertices
                .iter()
                .all(|vertex| vertex.bulge == 0.0) =>
        {
            let mut vertices = polyline.vertices.clone();
            vertices.reverse();
            Curve::Polyline(Polyline {
                vertices,
                closed: polyline.closed,
            })
        }
        Curve::Nurbs(curve) => Curve::Nurbs(curve.reversed()),
        _ => return None,
    })
}

/// Divides a periodic band along a closed section.
fn split_closed_between_loops(
    body: &mut Body,
    face: FaceKey,
    node: &Face,
    surface: &super::geometry::Surface,
    cutter: &Curve3,
    flat_cutter: &crate::geom2d::Curve,
    boundary_parts: &[(CoedgeKey, crate::geom2d::Curve)],
    period: f64,
) -> Option<[FaceKey; 2]> {
    let crate::geom2d::Curve::Line(line) = flat_cutter else {
        return None;
    };
    let mut direction = Vec3::new(line.end[0] - line.start[0], line.end[1] - line.start[1], 0.0);
    if direction.length() <= f64::EPSILON {
        return None;
    }
    // A circle round a cylinder's axis has a flat image running the way `u`
    // does, whichever way the circle itself turns. The cut's edge runs the
    // way the circle does, so that is the way read off here — a circle whose
    // plane faces down the axis otherwise left both rims of a band running
    // one way round.
    let (u0, v0) = surface.parameters_at(cutter.point_at(0.0))?;
    let (u1, v1) = surface.parameters_at(cutter.point_at(period * 1e-3))?;
    let wrapped = |delta: f64, period: Option<f64>| match period {
        Some(period) => delta - period * (delta / period).round(),
        None => delta,
    };
    let periods = pcurve::periods(surface);
    let running = Vec3::new(wrapped(u1 - u0, periods[0]), wrapped(v1 - v0, periods[1]), 0.0);
    if running.dot(direction) < 0.0 {
        direction = direction * -1.0;
    }

    let mut negative = Vec::new();
    let mut positive = Vec::new();
    // How far round each loop runs along the cut, in all: a rim a whole turn
    // one way or the other, a hole nothing.
    let mut negative_turn = 0.0;
    let mut positive_turn = 0.0;
    for ring in &node.loops {
        let coedges = &body.loops.get(*ring)?.coedges;
        let first = *coedges.first()?;
        let boundary = boundary_parts.iter().find(|(key, _)| *key == first)?.1.clone();
        let point = boundary.point_at(0.5);
        let turn: f64 = coedges
            .iter()
            .filter_map(|coedge| boundary_parts.iter().find(|(key, _)| key == coedge))
            .map(|(_, piece)| {
                let (from, to) = (piece.point_at(0.0), piece.point_at(1.0));
                Vec3::new(to[0] - from[0], to[1] - from[1], 0.0).dot(direction)
            })
            .sum();
        let side = direction.x * (point[1] - line.start[1])
            - direction.y * (point[0] - line.start[0]);
        if side < 0.0 {
            negative.push(*ring);
            negative_turn += turn;
        } else if side > 0.0 {
            positive.push(*ring);
            positive_turn += turn;
        } else {
            return None;
        }
    }
    if negative.is_empty() || positive.is_empty() {
        return None;
    }
    // Each half is a band: its new rim runs against the rim it keeps. The
    // cut's edge runs the way `direction` does, so its use in the negative
    // half is forward exactly when that half's own rim runs the other way.
    if negative_turn * positive_turn > 0.0 || negative_turn == 0.0 {
        return None;
    }
    let (kept, moved, cut_forward) = (negative, positive, negative_turn < 0.0);

    let seam = body.vertices.insert(Vertex {
        point: cutter.point_at(0.0),
        provenance: Provenance::Synthesized,
    });
    let curve = body.curves.insert(cutter.clone());
    let cut = body.edges.insert(Edge {
        curve,
        start_parameter: 0.0,
        end_parameter: period,
        start: seam,
        end: seam,
        coedges: Vec::new(),
        provenance: Provenance::Synthesized,
    });

    let kept_ring = body.loops.insert(Loop {
        coedges: Vec::new(),
        owner: face,
        provenance: Provenance::Synthesized,
    });
    let kept_coedge = body.coedges.insert(Coedge {
        edge: cut,
        forward: cut_forward,
        pcurve: None,
        owner: kept_ring,
        provenance: Provenance::Synthesized,
    });
    body.loops.get_mut(kept_ring)?.coedges = vec![kept_coedge];

    let other = body.faces.insert(Face {
        surface: node.surface,
        forward: node.forward,
        loops: Vec::new(),
        owner: node.owner,
        provenance: Provenance::Synthesized,
    });
    let moved_ring = body.loops.insert(Loop {
        coedges: Vec::new(),
        owner: other,
        provenance: Provenance::Synthesized,
    });
    let moved_coedge = body.coedges.insert(Coedge {
        edge: cut,
        forward: !cut_forward,
        pcurve: None,
        owner: moved_ring,
        provenance: Provenance::Synthesized,
    });
    body.loops.get_mut(moved_ring)?.coedges = vec![moved_coedge];
    body.edges.get_mut(cut)?.coedges = vec![kept_coedge, moved_coedge];

    for ring in &kept {
        body.loops.get_mut(*ring)?.owner = face;
    }
    for ring in &moved {
        body.loops.get_mut(*ring)?.owner = other;
    }
    let mut kept_loops = kept;
    kept_loops.push(kept_ring);
    let mut moved_loops = moved;
    moved_loops.push(moved_ring);
    let kept_face = body.faces.get_mut(face)?;
    kept_face.loops = kept_loops;
    kept_face.provenance.soil();
    body.faces.get_mut(other)?.loops = moved_loops;
    body.shells.get_mut(node.owner)?.faces.push(other);
    Some([face, other])
}

fn closed_period(curve: &Curve3) -> Option<f64> {
    match curve {
        Curve3::Circle(_) | Curve3::Ellipse(_) => Some(TAU),
        Curve3::PlanarSpline { curve, .. } if curve.is_closed() => Some(1.0),
        Curve3::Nurbs(curve) if curve.periodicity() => {
            let (start, end) = curve.domain();
            (end > start).then_some(end - start)
        }
        _ => None,
    }
}

fn periodic_images(
    curve: &crate::geom2d::Curve,
    periods: [Option<f64>; 2],
) -> Vec<crate::geom2d::Curve> {
    let turns = |period: Option<f64>| match period {
        Some(period) => (-2..=2).map(|turn| period * f64::from(turn)).collect(),
        None => vec![0.0],
    };
    let mut out = Vec::new();
    for u in turns(periods[0]) {
        for v in turns(periods[1]) {
            if let Some(moved) = curve.transformed(&Transform::translation([u, v])) {
                out.push(moved);
            }
        }
    }
    out
}

fn periodic_points(point: [f64; 2], periods: [Option<f64>; 2]) -> Vec<[f64; 2]> {
    let turns = |period: Option<f64>| match period {
        Some(period) => (-2..=2).map(|turn| period * f64::from(turn)).collect(),
        None => vec![0.0],
    };
    let mut out = Vec::new();
    for u in turns(periods[0]) {
        for v in turns(periods[1]) {
            out.push([point[0] + u, point[1] + v]);
        }
    }
    out
}

fn parameter_in_span(curve: &Curve3, point: [f64; 3], start: f64, end: f64) -> f64 {
    let parameter = curve.parameter_at(point);
    let Some(period) = closed_period(curve) else {
        return parameter;
    };
    let middle = 0.5 * (start + end);
    parameter + period * ((middle - parameter) / period).round()
}

/// Whether the near arc's closer runs with the cutter: true when the arc
/// lies on the left of the cut in the surface's parameter space, where a
/// forward face keeps its region.
fn near_side_forward(
    body: &Body,
    surface: &super::geometry::Surface,
    cutter: &Curve3,
    at: f64,
    near: &[CoedgeKey],
    face_forward: bool,
) -> Option<bool> {
    let period = pcurve::periods(surface)[0];
    let unwind = |value: f64, beside: f64| match period {
        Some(period) => value + period * ((beside - value) / period).round(),
        None => value,
    };
    let (u0, v0) = surface.parameters_at(cutter.point_at(at))?;
    let (u1, v1) = surface.parameters_at(cutter.point_at(at + 1.0e-4))?;
    let along = [unwind(u1, u0) - u0, v1 - v0];
    let sample = body.coedges.get(*near.get(near.len() / 2)?)?;
    let edge = body.edges.get(sample.edge)?;
    let point = body
        .curves
        .get(edge.curve)?
        .point_at(0.5 * (edge.start_parameter + edge.end_parameter));
    let (u, v) = surface.parameters_at(point)?;
    let side = along[0] * (v - v0) - along[1] * (unwind(u, u0) - u0);
    (side != 0.0).then_some((side > 0.0) == face_forward)
}

/// Whether `point` lies on the edge under `coedge`, within its span.
fn on_edge(body: &Body, coedge: CoedgeKey, point: [f64; 3], tolerance: f64) -> Option<bool> {
    let edge = body.edges.get(body.coedges.get(coedge)?.edge)?;
    let curve = body.curves.get(edge.curve)?;
    let parameter = parameter_in_span(curve, point, edge.start_parameter, edge.end_parameter);
    let (low, high) = (
        edge.start_parameter.min(edge.end_parameter),
        edge.start_parameter.max(edge.end_parameter),
    );
    Some(
        parameter >= low
            && parameter <= high
            && Vec3::from(curve.point_at(parameter)).distance(Vec3::from(point)) <= tolerance,
    )
}

/// Whether a point of a cutter lies on the face's boundary already. A spline
/// on either side is held to its fit rather than the modelling tolerance: a
/// file's spline and the curve it stands for run a hair apart, and a cut
/// along one beside the other only peels off a sliver between them.
fn on_boundary(
    body: &Body,
    boundary_parts: &[(CoedgeKey, crate::geom2d::Curve)],
    cutter: &Curve3,
    point: [f64; 3],
    fit: f64,
    tolerance: f64,
) -> bool {
    boundary_parts.iter().any(|(coedge, _)| {
        let spline = matches!(cutter, Curve3::Nurbs(_))
            || body
                .coedges
                .get(*coedge)
                .and_then(|coedge| body.edges.get(coedge.edge))
                .and_then(|edge| body.curves.get(edge.curve))
                .is_some_and(|curve| matches!(curve, Curve3::Nurbs(_)));
        let near = if spline { fit } else { tolerance };
        on_edge(body, *coedge, point, near).unwrap_or(false)
    })
}

/// A box round a curve in (u, v), padded for what a sampling can miss;
/// `None` for one without ends.
fn uv_box(curve: &crate::geom2d::Curve) -> Option<[[f64; 2]; 2]> {
    if matches!(curve, crate::geom2d::Curve::XLine(_) | crate::geom2d::Curve::Ray(_)) {
        return None;
    }
    let points: Vec<[f64; 2]> = match curve {
        crate::geom2d::Curve::Polyline(polyline)
            if polyline.vertices.iter().all(|vertex| vertex.bulge == 0.0) =>
        {
            polyline.vertices.iter().map(|vertex| vertex.position).collect()
        }
        _ => (0..=32).map(|step| curve.point_at(step as f64 / 32.0)).collect(),
    };
    let mut low = [f64::INFINITY; 2];
    let mut high = [f64::NEG_INFINITY; 2];
    for point in &points {
        for axis in 0..2 {
            low[axis] = low[axis].min(point[axis]);
            high[axis] = high[axis].max(point[axis]);
        }
    }
    if !low.iter().chain(&high).all(|value| value.is_finite()) {
        return None;
    }
    let pad = ((high[0] - low[0]).hypot(high[1] - low[1])) * 0.05 + 1e-9;
    Some([[low[0] - pad, low[1] - pad], [high[0] + pad, high[1] + pad]])
}

/// Whether two curves are one circle, whichever way round each runs.
pub(super) fn same_circle(one: &Curve3, other: &Curve3, tolerance: f64) -> bool {
    let (Curve3::Circle(one), Curve3::Circle(other)) = (one, other) else {
        return false;
    };
    let (Some(first), Some(second)) = (one.plane.normal(), other.plane.normal()) else {
        return false;
    };
    (one.radius - other.radius).abs() <= tolerance
        && Vec3::from(one.plane.origin).distance(Vec3::from(other.plane.origin)) <= tolerance
        && Vec3::from(first).is_parallel_to(Vec3::from(second), tolerance)
}

/// Where two circles lying on `sphere` cross: the points where the line
/// common to their planes meets it. None for circles on parallel planes,
/// which either coincide or never meet.
fn circles_meet_on_sphere(
    sphere: &super::geometry::Sphere,
    one: &super::geometry::Circle3,
    other: &super::geometry::Circle3,
    tolerance: f64,
) -> Vec<[f64; 3]> {
    let (Some(first), Some(second)) = (one.plane.normal(), other.plane.normal()) else {
        return Vec::new();
    };
    let (first, second) = (Vec3::from(first), Vec3::from(second));
    if first.cross(second).length() <= tolerance {
        return Vec::new();
    }
    let Some(along) = first.cross(second).normalize() else {
        return Vec::new();
    };
    let cosine = first.dot(second);
    let offsets = [
        first.dot(Vec3::from(one.plane.origin)),
        second.dot(Vec3::from(other.plane.origin)),
    ];
    let square = 1.0 - cosine * cosine;
    let base = first * ((offsets[0] - offsets[1] * cosine) / square)
        + second * ((offsets[1] - offsets[0] * cosine) / square);
    let from_centre = base - Vec3::from(sphere.frame.origin);
    let half = along.dot(from_centre);
    let discriminant = half * half - (from_centre.dot(from_centre) - sphere.radius * sphere.radius);
    if discriminant < -tolerance * sphere.radius {
        return Vec::new();
    }
    let root = discriminant.max(0.0).sqrt();
    let mut points = vec![(base + along * (-half - root)).to_array()];
    if root > tolerance {
        points.push((base + along * (-half + root)).to_array());
    }
    points
}

/// Where the cut met the boundary.
#[derive(Clone)]
struct Landing {
    edge: EdgeKey,
    coedge: CoedgeKey,
    point: [f64; 3],
}

/// The vertex at a landing: an existing end of the edge when the cut runs
/// into a corner, otherwise a new one from splitting the edge there.
fn vertex_at(body: &mut Body, landing: &Landing, tolerance: f64) -> Option<VertexKey> {
    let curve_key = body.edges.get(landing.edge)?.curve;
    let curve = body.curves.get(curve_key)?.clone();
    let candidates: Vec<EdgeKey> = body
        .edges
        .iter()
        .filter_map(|(key, edge)| (edge.curve == curve_key).then_some(key))
        .collect();
    for candidate in candidates {
        let edge = body.edges.get(candidate)?.clone();
        for end in [edge.start, edge.end] {
            let point = body.vertices.get(end)?.point;
            if Vec3::from(point).distance(Vec3::from(landing.point)) <= tolerance {
                return Some(end);
            }
        }
        let parameter = parameter_in_span(
            &curve,
            landing.point,
            edge.start_parameter,
            edge.end_parameter,
        );
        let low = edge.start_parameter.min(edge.end_parameter);
        let high = edge.start_parameter.max(edge.end_parameter);
        if parameter > low && parameter < high {
            let (near, far) = split_edge(body, candidate, parameter)?;
            return shared_vertex(body, near, far);
        }
    }
    None
}

/// The vertex an edge split introduced, given the two halves.
pub fn shared_vertex(body: &Body, near: EdgeKey, far: EdgeKey) -> Option<VertexKey> {
    let near = body.edges.get(near)?;
    let far = body.edges.get(far)?;
    if near.end == far.start {
        return Some(near.end);
    }
    [near.start, near.end]
        .into_iter()
        .find(|key| *key == far.start || *key == far.end)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::brep::make::{cuboid, cylinder};
    use crate::space::Vec3;

    fn box_body() -> Body {
        cuboid([0.0, 0.0, 0.0], [2.0, 4.0, 6.0]).expect("a box")
    }

    #[test]
    fn splitting_an_edge_leaves_the_body_consistent() {
        let mut body = box_body();
        let edge = body.edges.keys().next().unwrap();
        split_edge(&mut body, edge, 0.5).expect("a split at the middle");
        let flaws = body.validate();
        assert!(flaws.is_empty(), "{flaws:?}");
    }

    #[test]
    fn splitting_an_edge_adds_one_vertex_and_one_edge() {
        // Which leaves V − E + F where it was: the shape has not changed,
        // only how it is written down.
        let mut body = box_body();
        let before = (body.vertices.len(), body.edges.len(), body.faces.len());
        let characteristic = body.euler_characteristic();
        let edge = body.edges.keys().next().unwrap();
        split_edge(&mut body, edge, 0.5).unwrap();
        assert_eq!(body.vertices.len(), before.0 + 1);
        assert_eq!(body.edges.len(), before.1 + 1);
        assert_eq!(body.faces.len(), before.2);
        assert_eq!(body.euler_characteristic(), characteristic);
    }

    #[test]
    fn splitting_a_closed_edge_reports_the_new_vertex() {
        let mut body = cylinder([0.0; 3], 2.0, 4.0).unwrap();
        let edge = body
            .edge_keys()
            .find(|key| {
                let edge = body.edges.get(*key).unwrap();
                edge.start == edge.end && edge.end_parameter > edge.start_parameter
            })
            .unwrap();
        let expected = body
            .curves
            .get(body.edges.get(edge).unwrap().curve)
            .unwrap()
            .point_at(1.0);
        let (near, far) = split_edge(&mut body, edge, 1.0).unwrap();
        let vertex = shared_vertex(&body, near, far).unwrap();
        assert_eq!(body.vertices.get(vertex).unwrap().point, expected);
    }

    #[test]
    fn both_faces_that_used_the_edge_gain_a_coedge() {
        // The one that is easy to forget. Splitting only the near face's loop
        // leaves the far one a coedge short, its ring open, and the failure
        // turns up much later as a boolean losing a wall.
        let mut body = box_body();
        let edge = body.edges.keys().next().unwrap();
        let faces: Vec<_> = body
            .edges
            .get(edge)
            .unwrap()
            .coedges
            .iter()
            .map(|c| {
                let owner = body.coedges.get(*c).unwrap().owner;
                body.loops.get(owner).unwrap().owner
            })
            .collect();
        assert_eq!(faces.len(), 2);
        let before: Vec<usize> = faces.iter().map(|f| body.face_coedges(*f).len()).collect();
        split_edge(&mut body, edge, 0.5).unwrap();
        for (face, was) in faces.iter().zip(before) {
            assert_eq!(body.face_coedges(*face).len(), was + 1, "face {face:?}");
        }
    }

    #[test]
    fn the_new_vertex_sits_on_the_curve_where_it_was_asked_for() {
        let mut body = box_body();
        let edge = body.edges.keys().next().unwrap();
        let expected = {
            let node = body.edges.get(edge).unwrap();
            body.curves.get(node.curve).unwrap().point_at(0.25)
        };
        let (near, far) = split_edge(&mut body, edge, 0.25).unwrap();
        let vertex = shared_vertex(&body, near, far).unwrap();
        let point = body.vertices.get(vertex).unwrap().point;
        assert!(Vec3::from(point).distance(Vec3::from(expected)) < 1e-12);
        assert!(body.worst_vertex_gap() < 1e-12);
    }

    #[test]
    fn the_halves_run_the_same_way_the_whole_did() {
        let mut body = box_body();
        let edge = body.edges.keys().next().unwrap();
        let (start, end) = {
            let node = body.edges.get(edge).unwrap();
            (node.start, node.end)
        };
        let (near, far) = split_edge(&mut body, edge, 0.5).unwrap();
        assert_eq!(body.edges.get(near).unwrap().start, start);
        assert_eq!(body.edges.get(far).unwrap().end, end);
        let middle = shared_vertex(&body, near, far).unwrap();
        assert_eq!(body.edges.get(near).unwrap().end, middle);
        assert_eq!(body.edges.get(far).unwrap().start, middle);
    }

    #[test]
    fn every_loop_still_closes_after_a_split() {
        let mut body = box_body();
        let edge = body.edges.keys().next().unwrap();
        split_edge(&mut body, edge, 0.5).unwrap();
        for (key, ring) in body.loops.iter() {
            let count = ring.coedges.len();
            for index in 0..count {
                let (_, ends) = body.coedge_vertices(ring.coedges[index]).unwrap();
                let (begins, _) = body
                    .coedge_vertices(ring.coedges[(index + 1) % count])
                    .unwrap();
                assert_eq!(ends, begins, "loop {key:?} breaks after {index}");
            }
        }
    }

    #[test]
    fn a_backward_coedge_gets_its_new_piece_on_the_right_side() {
        // Every edge of a box is traversed forwards by one face and backwards
        // by the other, so this case is covered by any split — but only if
        // the insertion point depends on the sense. Putting the new coedge
        // after the old one in both cases breaks exactly the backward loop,
        // which is what the closure check above would catch.
        let mut body = box_body();
        let edge = body.edges.keys().next().unwrap();
        let backward = body
            .edges
            .get(edge)
            .unwrap()
            .coedges
            .iter()
            .copied()
            .find(|c| !body.coedges.get(*c).unwrap().forward)
            .expect("one side runs against the curve");
        let ring = body.coedges.get(backward).unwrap().owner;
        let before = body.loops.get(ring).unwrap().coedges.clone();
        let at = before.iter().position(|c| *c == backward).unwrap();
        split_edge(&mut body, edge, 0.5).unwrap();
        let after = body.loops.get(ring).unwrap().coedges.clone();
        assert_eq!(after.len(), before.len() + 1);
        assert_eq!(after[at + 1], backward, "the new piece comes first");
    }

    #[test]
    fn splitting_twice_divides_an_edge_into_three() {
        let mut body = box_body();
        let edge = body.edges.keys().next().unwrap();
        let (near, far) = split_edge(&mut body, edge, 0.5).unwrap();
        split_edge(&mut body, far, 0.75).unwrap();
        let flaws = body.validate();
        assert!(flaws.is_empty(), "{flaws:?}");
        assert_eq!(body.edges.len(), 14);
        assert_eq!(body.vertices.len(), 10);
        assert_eq!(body.euler_characteristic(), 2);
        assert!(body.edges.contains(near));
    }

    #[test]
    fn a_split_at_an_end_is_refused() {
        let mut body = box_body();
        let edge = body.edges.keys().next().unwrap();
        assert!(split_edge(&mut body, edge, 0.0).is_none());
        assert!(split_edge(&mut body, edge, 1.0).is_none());
        assert!(split_edge(&mut body, edge, 1.5).is_none());
        assert!(split_edge(&mut body, edge, -0.5).is_none());
        assert!(body.validate().is_empty(), "nothing was changed");
        assert_eq!(body.edges.len(), 12);
    }

    #[test]
    fn splitting_by_a_point_lands_where_the_point_is() {
        let mut body = box_body();
        let edge = body.edges.keys().next().unwrap();
        let (start, end) = body.edge_endpoints(edge).unwrap();
        let middle = Vec3::from(start).lerp(Vec3::from(end), 0.3).to_array();
        let (near, far) = split_edge_at(&mut body, edge, middle).unwrap();
        let vertex = shared_vertex(&body, near, far).unwrap();
        let point = body.vertices.get(vertex).unwrap().point;
        assert!(Vec3::from(point).distance(Vec3::from(middle)) < 1e-12);
        assert!(body.validate().is_empty());
    }


    /// The face of the box lying on z = 0, and its surface.
    fn bottom_face(body: &Body) -> FaceKey {
        body.face_keys()
            .find(|key| {
                let face = body.faces.get(*key).unwrap();
                let crate::brep::Surface::Plane(plane) =
                    body.surfaces.get(face.surface).unwrap()
                else {
                    unreachable!()
                };
                plane.origin[2].abs() < 1e-9 && plane.normal().unwrap()[2].abs() > 0.9
            })
            .expect("a box has a bottom")
    }

    /// A line across the box's bottom face at constant y, running in x.
    fn across_bottom(y: f64) -> Curve3 {
        Curve3::Line(crate::brep::Line3 {
            origin: [-1.0, y, 0.0],
            direction: [1.0, 0.0, 0.0],
        })
    }

    #[test]
    fn cutting_a_face_leaves_two_and_the_body_consistent() {
        let mut body = box_body();
        let face = bottom_face(&body);
        let [kept, made] = split_face(&mut body, face, &across_bottom(2.0), 1e-9)
            .expect("a cut straight across");
        assert_eq!(kept, face);
        assert_ne!(made, face);
        assert_eq!(body.faces.len(), 7);
        let flaws = body.validate();
        assert!(flaws.is_empty(), "{flaws:?}");
    }

    #[test]
    fn a_cut_face_is_still_a_closed_solid() {
        // Two vertices, three edges and one face are added, which leaves
        // V − E + F alone: the shape has not changed, only its description.
        let mut body = box_body();
        let before = body.euler_characteristic();
        let face = bottom_face(&body);
        split_face(&mut body, face, &across_bottom(2.0), 1e-9).unwrap();
        assert_eq!(body.euler_characteristic(), before);
        assert_eq!(body.vertices.len(), 10);
        assert_eq!(body.edges.len(), 15);
        assert_eq!(body.faces.len(), 7);
    }

    #[test]
    fn both_halves_lie_on_the_surface_the_face_did() {
        let mut body = box_body();
        let face = bottom_face(&body);
        let surface = body.faces.get(face).unwrap().surface;
        let [kept, made] = split_face(&mut body, face, &across_bottom(2.0), 1e-9).unwrap();
        assert_eq!(body.faces.get(kept).unwrap().surface, surface);
        assert_eq!(body.faces.get(made).unwrap().surface, surface);
        // And in the same shell, so the solid is still one piece.
        assert_eq!(
            body.faces.get(kept).unwrap().owner,
            body.faces.get(made).unwrap().owner
        );
    }

    #[test]
    fn the_two_halves_share_the_new_edge_running_it_opposite_ways() {
        // What makes it a division rather than two coincident walls.
        let mut body = box_body();
        let face = bottom_face(&body);
        let before: Vec<_> = body.edges.keys().collect();
        split_face(&mut body, face, &across_bottom(2.0), 1e-9).unwrap();
        let cut = body
            .edges
            .keys()
            .find(|key| !before.contains(key) && body.edges.get(*key).unwrap().coedges.len() == 2)
            .expect("a new shared edge");
        let senses: Vec<bool> = body
            .edges
            .get(cut)
            .unwrap()
            .coedges
            .iter()
            .map(|c| body.coedges.get(*c).unwrap().forward)
            .collect();
        assert_ne!(senses[0], senses[1]);
    }

    #[test]
    fn the_halves_add_up_to_the_whole() {
        // Four coedges before; after the cut each half has three of the
        // original's pieces plus the cut, and the two edges it crossed have
        // each become two.
        let mut body = box_body();
        let face = bottom_face(&body);
        let [kept, made] = split_face(&mut body, face, &across_bottom(2.0), 1e-9).unwrap();
        assert_eq!(body.face_coedges(kept).len(), 4);
        assert_eq!(body.face_coedges(made).len(), 4);
    }

    #[test]
    fn a_cut_from_corner_to_corner_uses_the_corners_it_finds() {
        // The diagonal of the bottom face. Both ends land exactly on
        // existing vertices, so nothing is split and no vertex is added —
        // which a version that always split would get wrong by leaving two
        // zero-length edges behind.
        let mut body = cuboid([0.0; 3], [4.0, 4.0, 4.0]).unwrap();
        let face = bottom_face(&body);
        let diagonal = Curve3::Line(crate::brep::Line3 {
            origin: [0.0, 0.0, 0.0],
            direction: [1.0, 1.0, 0.0],
        });
        let vertices = body.vertices.len();
        split_face(&mut body, face, &diagonal, 1e-9).expect("a diagonal cut");
        assert_eq!(body.vertices.len(), vertices, "no new corners were needed");
        assert_eq!(body.edges.len(), 13, "only the cut itself");
        let flaws = body.validate();
        assert!(flaws.is_empty(), "{flaws:?}");
    }

    #[test]
    fn a_cut_that_misses_the_face_does_nothing() {
        let mut body = box_body();
        let face = bottom_face(&body);
        let before = body.faces.len();
        // Well outside the box's footprint.
        assert!(split_face(&mut body, face, &across_bottom(99.0), 1e-9).is_none());
        assert_eq!(body.faces.len(), before);
        assert!(body.validate().is_empty());
    }

    #[test]
    fn a_cutter_off_the_surface_is_refused() {
        let mut body = box_body();
        let face = bottom_face(&body);
        let above = Curve3::Line(crate::brep::Line3 {
            origin: [-1.0, 2.0, 1.0],
            direction: [1.0, 0.0, 0.0],
        });
        assert!(split_face(&mut body, face, &above, 1e-9).is_none());
        assert!(body.validate().is_empty());
    }

    #[test]
    fn cutting_twice_gives_three_pieces() {
        let mut body = cuboid([0.0; 3], [9.0, 9.0, 9.0]).unwrap();
        let face = bottom_face(&body);
        let [kept, _] = split_face(&mut body, face, &across_bottom(3.0), 1e-9).unwrap();
        // The half that still reaches y = 6 is cut again.
        let second = [kept]
            .into_iter()
            .chain(body.face_keys())
            .find(|key| split_face(&mut body.clone(), *key, &across_bottom(6.0), 1e-9).is_some())
            .expect("one half still spans y = 6");
        split_face(&mut body, second, &across_bottom(6.0), 1e-9).unwrap();
        assert_eq!(body.faces.len(), 8, "six sides, cut twice");
        let flaws = body.validate();
        assert!(flaws.is_empty(), "{flaws:?}");
        assert_eq!(body.euler_characteristic(), 2);
    }

    #[test]
    fn a_cut_at_survey_coordinates_works_the_same() {
        let origin = [512_345.678, 4_512_345.678, 91.5];
        let mut body = cuboid(origin, [2.0, 4.0, 6.0]).unwrap();
        let face = body
            .face_keys()
            .find(|key| {
                let face = body.faces.get(*key).unwrap();
                let crate::brep::Surface::Plane(plane) =
                    body.surfaces.get(face.surface).unwrap()
                else {
                    unreachable!()
                };
                (plane.origin[2] - origin[2]).abs() < 1e-6
                    && plane.normal().unwrap()[2].abs() > 0.9
            })
            .unwrap();
        let cutter = Curve3::Line(crate::brep::Line3 {
            origin: [origin[0] - 1.0, origin[1] + 2.0, origin[2]],
            direction: [1.0, 0.0, 0.0],
        });
        split_face(&mut body, face, &cutter, 1e-6).expect("a cut at survey coordinates");
        let flaws = body.validate();
        assert!(flaws.is_empty(), "{flaws:?}");
        assert!(body.worst_vertex_gap() < 1e-6);
    }

    #[test]
    fn a_face_with_holes_is_not_guessed_at() {
        let mut body = box_body();
        let face = bottom_face(&body);
        // Give it a second loop, standing in for a hole.
        let extra = body.loops.insert(Loop {
            coedges: Vec::new(),
            owner: face,
            provenance: Provenance::Synthesized,
        });
        body.faces.get_mut(face).unwrap().loops.push(extra);
        assert!(split_face(&mut body, face, &across_bottom(2.0), 1e-9).is_none());
    }

    #[test]
    fn a_split_dirties_what_it_touched_and_leaves_the_rest_clean() {
        let mut body = box_body();
        for node in body.edges.values_mut() {
            node.provenance = Provenance::Clean(crate::brep::SourceRef::new(0));
        }
        for node in body.faces.values_mut() {
            node.provenance = Provenance::Clean(crate::brep::SourceRef::new(0));
        }
        let edge = body.edges.keys().next().unwrap();
        split_edge(&mut body, edge, 0.5).unwrap();
        let dirty_faces = body
            .faces
            .iter()
            .filter(|(_, f)| !f.provenance.is_reusable())
            .count();
        assert_eq!(dirty_faces, 2, "only the two the edge bounded");
        let clean_edges = body
            .edges
            .iter()
            .filter(|(_, e)| e.provenance.is_reusable())
            .count();
        assert_eq!(clean_edges, 11, "the other eleven are untouched");
    }
}
