//! Cutting each solid's faces where the other's pass through them.
//!
//! The step between finding the intersection curves and deciding what to
//! keep. Afterwards, every face of either solid is wholly inside the other or
//! wholly outside it — never partly both — so classifying a piece is one
//! question with one answer instead of a face that would have to be described
//! as "inside over here".
//!
//! Both solids are imprinted, not one. A union has to keep the outer part of
//! *each*, so each needs the other's curves cut into it.
//!
//! # Why it can fail, and why that is reported
//!
//! A face pair whose intersection has no closed form, a pair of coincident
//! faces, a cut this kernel cannot make: each leaves the imprint incomplete
//! in a way the caller cannot see by looking at the result. A boolean run on
//! a half-imprinted body produces a solid — one with a wall missing. So the
//! failures are returned, and a boolean refuses on them.

use super::bounds::{face_bounds, Aabb};
use super::geometry::{Curve3, Surface};
use super::intersect::{surfaces, Meeting};
use super::split::{split_edge, split_face};
use super::Provenance;
use super::topology::{
    Body, Coedge, CoedgeKey, Edge, Face, FaceKey, Loop, LoopKey, Vertex, VertexKey,
};
use crate::space::{NurbsCurve3, Parameterization, Vec3};

/// Why an imprint could not be completed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Snag {
    /// Two faces meet along something this kernel has no closed form for.
    NoClosedForm,
    /// Two faces lie on the same surface. Deciding what that leaves needs
    /// their overlap worked out in parameter space, which is its own
    /// operation.
    Coincident,
    /// The curves were found but a face could not be cut along one of them —
    /// a cut crossing the boundary more than twice, or closing inside the
    /// face.
    CutRefused,
}

/// What an imprint did.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Imprint {
    /// How many faces were cut in two, across both solids.
    pub cuts: usize,
    /// How many face pairs were found to meet at all.
    pub meetings: usize,
}

/// Cuts each body's faces along the curves it shares with the other.
///
/// Neither body's shape changes — an imprint only adds edges — so the result
/// still passes [`Body::validate`] and still has the same volume.
///
/// `tolerance` is passed through to the intersection and the cutting.
pub fn imprint(a: &mut Body, b: &mut Body, tolerance: f64) -> Result<Imprint, Snag> {
    let meetings = shared_curves(a, b, tolerance)?;
    let count = meetings.len();
    // Islands first, while the faces they go into are still the ones found;
    // the largest first, so one lying inside another goes into the face the
    // first made rather than beside it.
    let mut islands: Vec<(bool, FaceKey, LoopKey, f64)> = Vec::new();
    for (into_a, face, _, ring) in meetings.iter().flat_map(|meeting| &meeting.islands) {
        if islands.iter().any(|(side, _, seen, _)| side == into_a && seen == ring) {
            continue;
        }
        let from: &Body = if *into_a { b } else { a };
        let size = loop_walk(from, *ring, 4).map_or(0.0, |walk| {
            walk.iter().map(|(point, _)| point.distance(walk[0].0)).fold(0.0, f64::max)
        });
        islands.push((*into_a, *face, *ring, size));
    }
    islands.sort_by(|x, y| y.3.total_cmp(&x.3));
    let mut made: Vec<(bool, FaceKey, FaceKey)> = Vec::new();
    for (into_a, face, ring, _) in islands {
        let (into, from): (&mut Body, &Body) = if into_a { (a, b) } else { (b, a) };
        let probe = loop_walk(from, ring, 4).and_then(|walk| walk.first().map(|(point, _)| *point));
        let fit = loop_walk(from, ring, 8).map_or(tolerance, |walk| loop_fit(&walk, tolerance));
        // The innermost face made so far from this one that holds the loop.
        let target = made
            .iter()
            .rev()
            .filter(|(side, origin, _)| *side == into_a && *origin == face)
            .map(|(_, _, island)| *island)
            .find(|island| {
                probe.is_some_and(|point| {
                    super::classify::face_distance(into, *island, point.to_array(), fit)
                        .is_some_and(|gap| gap <= fit)
                })
            })
            .unwrap_or(face);
        let island = copy_island(into, target, from, ring).ok_or(Snag::CutRefused)?;
        made.push((into_a, face, island));
    }
    // Face pairs on the same two surfaces all report the same curve — every
    // part of a divided sphere meets a plane in one circle — and each copy
    // would be tried against every face again for nothing.
    let mut curves: Vec<Curve3> = Vec::new();
    for curve in meetings.iter().flat_map(|meeting| &meeting.curves) {
        if !curves.iter().any(|seen| same_curve(seen, curve, tolerance)) {
            curves.push(curve.clone());
        }
    }
    // One intersection reached two ways — a file's spline for a shared
    // wall's edge, and the same curve found between the faces that meet
    // there — is two splines a fit apart, which cross and recross each other
    // and cut slivers between them. Only the longest of such copies cuts.
    let mut splines: Vec<(f64, Vec<[f64; 3]>, usize)> = curves
        .iter()
        .enumerate()
        .filter_map(|(index, curve)| {
            let Curve3::Nurbs(spline) = curve else {
                return None;
            };
            let (start, end) = spline.domain();
            let points: Vec<[f64; 3]> = (0..=32)
                .map(|step| curve.point_at(start + (end - start) * step as f64 / 32.0))
                .collect();
            let length = points
                .windows(2)
                .map(|pair| Vec3::from(pair[0]).distance(Vec3::from(pair[1])))
                .sum::<f64>();
            Some((length, points, index))
        })
        .collect();
    splines.sort_by(|a, b| b.0.total_cmp(&a.0));
    let mut dropped = Vec::new();
    for (position, (length, points, index)) in splines.iter().enumerate() {
        let fit = tolerance.max(length * 1e-3);
        let copied = splines[..position].iter().any(|(_, _, longer)| {
            !dropped.contains(longer)
                && points.iter().all(|point| {
                    let curve = &curves[*longer];
                    Vec3::from(curve.point_at(curve.parameter_at(*point)))
                        .distance(Vec3::from(*point))
                        <= fit
                })
        });
        if copied {
            dropped.push(*index);
        }
    }
    let curves: Vec<Curve3> = curves
        .into_iter()
        .enumerate()
        .filter_map(|(index, curve)| (!dropped.contains(&index)).then_some(curve))
        .collect();
    // A curve that only touches a face's boundary lands on a corner, and the
    // corner may be one the other body lends this one only once both are
    // cut; so the curves go round again until they cut nothing new.
    let mut cuts = 0;
    for _ in 0..4 {
        let made = cut_along(a, &curves, tolerance)? + cut_along(b, &curves, tolerance)?;
        cuts += made;
        // Stitching needs matching edge partitions on both bodies.
        align_edge_vertices(a, b, tolerance);
        align_edge_vertices(b, a, tolerance);
        if made == 0 {
            break;
        }
    }
    // Cuts landing on a spline put their corners where that spline runs —
    // a fit off where the other body's own corner is. Within that fit, a
    // corner the imprint made is the same corner as one already there.
    let reach = [&*a, &*b]
        .iter()
        .filter_map(|body| super::bounds::body_bounds(body))
        .map(|bounds| Vec3::from(bounds.min).distance(Vec3::from(bounds.max)))
        .fold(tolerance, |reach, size| reach.max(size * 1e-6));
    snap_cut_vertices(a, b, tolerance, reach);
    snap_cut_vertices(b, a, tolerance, reach);
    fuse_cut_vertices(a, tolerance, reach);
    fuse_cut_vertices(b, tolerance, reach);
    Ok(Imprint {
        cuts,
        meetings: count,
    })
}

/// The corners on a spline edge: the only ones a fit can have put off.
fn on_splines(body: &Body) -> std::collections::HashSet<VertexKey> {
    body.edges
        .iter()
        .filter(|(_, edge)| {
            body.curves.get(edge.curve).is_some_and(|curve| matches!(curve, Curve3::Nurbs(_)))
        })
        .flat_map(|(_, edge)| [edge.start, edge.end])
        .collect()
}

/// Moves each corner the imprint made in `target` onto the nearest corner of
/// `source` within `reach`, so the two bodies' copies of it coincide.
fn snap_cut_vertices(target: &mut Body, source: &Body, tolerance: f64, reach: f64) {
    let corners: Vec<Vec3> = source
        .vertices
        .iter()
        .map(|(_, vertex)| Vec3::from(vertex.point))
        .collect();
    let keys: Vec<VertexKey> = target.vertices.keys().collect();
    let splined = on_splines(target);
    for key in keys {
        if !splined.contains(&key) {
            continue;
        }
        let Some(vertex) = target.vertices.get_mut(key) else {
            continue;
        };
        if !matches!(vertex.provenance, Provenance::Synthesized) {
            continue;
        }
        let here = Vec3::from(vertex.point);
        let nearest = corners
            .iter()
            .map(|corner| (corner.distance(here), *corner))
            .min_by(|x, y| x.0.total_cmp(&y.0));
        if let Some((gap, corner)) = nearest {
            if gap > tolerance && gap <= reach {
                vertex.point = corner.to_array();
            }
        }
    }
}

/// Merges each corner the imprint made into another corner of the same body
/// within `reach` (on a spline) or `tolerance`, and drops the edges left
/// running from a corner to itself.
/// Two of the source's own corners are never merged: a file may well have an
/// edge that short.
fn fuse_cut_vertices(body: &mut Body, tolerance: f64, reach: f64) {
    let keys: Vec<VertexKey> = body.vertices.keys().collect();
    let splined = on_splines(body);
    let made = |body: &Body, key: VertexKey| {
        body.vertices
            .get(key)
            .is_some_and(|vertex| matches!(vertex.provenance, Provenance::Synthesized))
    };
    // How far a made corner may be from the one it is: a spline's fit, or
    // for exact curves the modelling tolerance two cuts landing on one
    // crossing still miss each other by.
    let reach_of = |key: VertexKey| if splined.contains(&key) { reach } else { tolerance };
    let mut into: std::collections::HashMap<VertexKey, VertexKey> = Default::default();
    for key in &keys {
        if !made(body, *key) || into.contains_key(key) {
            continue;
        }
        let Some(here) = body.vertices.get(*key).map(|vertex| Vec3::from(vertex.point)) else {
            continue;
        };
        // A source corner first, if one is near; otherwise another made one.
        let target = keys
            .iter()
            .filter(|other| *other != key && !into.contains_key(*other))
            .filter_map(|other| {
                let gap = Vec3::from(body.vertices.get(*other)?.point).distance(here);
                (gap <= reach_of(*key)).then_some((made(body, *other), gap, *other))
            })
            .min_by(|x, y| x.0.cmp(&y.0).then(x.1.total_cmp(&y.1)));
        if let Some((_, _, other)) = target {
            into.insert(*key, other);
        }
    }
    if into.is_empty() {
        return;
    }
    let resolve = |mut key: VertexKey| {
        let mut steps = 0;
        while let Some(next) = into.get(&key) {
            key = *next;
            steps += 1;
            if steps > 64 {
                break;
            }
        }
        key
    };
    let edges: Vec<super::topology::EdgeKey> = body.edge_keys().collect();
    for key in edges {
        let Some(edge) = body.edges.get_mut(key) else {
            continue;
        };
        let was_closed = edge.start == edge.end;
        edge.start = resolve(edge.start);
        edge.end = resolve(edge.end);
        if was_closed || edge.start != edge.end {
            continue;
        }
        // An open edge now starting and ending at one corner spans nothing.
        let coedges = edge.coedges.clone();
        for coedge in coedges {
            if let Some(owner) = body.coedges.get(coedge).map(|coedge| coedge.owner) {
                if let Some(ring) = body.loops.get_mut(owner) {
                    ring.coedges.retain(|kept| *kept != coedge);
                }
            }
            body.coedges.remove(coedge);
        }
        body.edges.remove(key);
    }
    for key in into.keys() {
        body.vertices.remove(*key);
    }
    // A loop that was nothing but such edges is gone with them, and a face
    // left with no loop at all was a sliver between two of them.
    let faces: Vec<FaceKey> = body.face_keys().collect();
    for face in faces {
        let Some(node) = body.faces.get(face) else {
            continue;
        };
        let empty: Vec<LoopKey> = node
            .loops
            .iter()
            .copied()
            .filter(|ring| body.loops.get(*ring).is_none_or(|ring| ring.coedges.is_empty()))
            .collect();
        if empty.is_empty() {
            continue;
        }
        for ring in &empty {
            body.loops.remove(*ring);
        }
        let Some(node) = body.faces.get_mut(face) else {
            continue;
        };
        node.loops.retain(|ring| !empty.contains(ring));
        if node.loops.is_empty() {
            let shell = node.owner;
            body.faces.remove(face);
            if let Some(shell) = body.shells.get_mut(shell) {
                shell.faces.retain(|kept| *kept != face);
            }
        }
    }
}

fn align_edge_vertices(source: &Body, target: &mut Body, tolerance: f64) {
    let points: Vec<[f64; 3]> = source.vertices.iter().map(|(_, vertex)| vertex.point).collect();
    for point in points {
        let edges: Vec<_> = target.edge_keys().collect();
        for key in edges {
            let Some(edge) = target.edges.get(key) else {
                continue;
            };
            if edge.coedges.is_empty() {
                continue;
            }
            let splittable = edge.coedges.iter().all(|coedge| {
                target.coedges.get(*coedge).is_some_and(|coedge| {
                    matches!(
                        coedge.pcurve.as_ref(),
                        None
                            | Some(&crate::geom2d::Curve::Line(_))
                            | Some(&crate::geom2d::Curve::Circle(_))
                            | Some(&crate::geom2d::Curve::Arc(_))
                            | Some(&crate::geom2d::Curve::Ellipse(_))
                            | Some(&crate::geom2d::Curve::Nurbs(_))
                    )
                })
            });
            if !splittable {
                continue;
            }
            let Some(curve) = target.curves.get(edge.curve) else {
                continue;
            };
            let mut parameter = curve.parameter_at(point);
            if matches!(curve, Curve3::Circle(_) | Curve3::Ellipse(_)) {
                let middle = 0.5 * (edge.start_parameter + edge.end_parameter);
                parameter += std::f64::consts::TAU
                    * ((middle - parameter) / std::f64::consts::TAU).round();
            }
            let span = edge.end_parameter - edge.start_parameter;
            if span == 0.0 {
                continue;
            }
            let across = (parameter - edge.start_parameter) / span;
            if !(1e-9..=1.0 - 1e-9).contains(&across)
                || Vec3::from(curve.point_at(parameter)).distance(Vec3::from(point)) > tolerance
            {
                continue;
            }
            split_edge(target, key, parameter);
        }
    }
}

/// Whether two curves trace the same points: one circle, or one line.
fn same_curve(one: &Curve3, other: &Curve3, tolerance: f64) -> bool {
    match (one, other) {
        (Curve3::Circle(_), Curve3::Circle(_)) => super::split::same_circle(one, other, tolerance),
        (Curve3::Line(one), Curve3::Line(other)) => {
            let direction = Vec3::from(one.direction);
            let Some(unit) = direction.normalize() else {
                return false;
            };
            let offset = Vec3::from(other.origin) - Vec3::from(one.origin);
            direction.is_parallel_to(Vec3::from(other.direction), tolerance)
                && (offset - unit * offset.dot(unit)).length() <= tolerance
        }
        _ => false,
    }
}

/// Whether two faces share any area rather than merely a plane.
///
/// Measured on their boxes, shrunk by the tolerance so a pair meeting along
/// an edge — which is what coplanar side walls of stacked solids do — reads
/// as apart rather than as an overlap with nothing in it.
///
/// A face that cannot be bounded is treated as overlapping, since "cannot
/// exclude" is the only safe answer a box test may give.
fn overlap(a: &Body, one: FaceKey, b: &Body, other: FaceKey, tolerance: f64) -> bool {
    let (Some(near), Some(far)) = (face_bounds(a, one), face_bounds(b, other)) else {
        return true;
    };
    shrunk(near, tolerance).overlaps(&shrunk(far, tolerance))
}

/// A box pulled in on every axis that has room to spare.
///
/// A face's box is flat in one direction by definition, and pulling that one
/// in turns it inside out — every coplanar pair then reads as apart, and a
/// wall that genuinely overlaps is passed over without a word.
fn shrunk(bounds: Aabb, by: f64) -> Aabb {
    let mut out = bounds;
    for axis in 0..3 {
        if bounds.max[axis] - bounds.min[axis] > 2.0 * by {
            out.min[axis] += by;
            out.max[axis] -= by;
        }
    }
    out
}

/// Whether two faces on the same surface cover the same region of it.
///
/// Compared by their corners rather than by area: two rings enclosing the
/// same area can be different shapes, and what matters here is that neither
/// face has any part the other does not.
pub fn same_ground(
    a: &Body,
    one: FaceKey,
    b: &Body,
    other: FaceKey,
    tolerance: f64,
) -> bool {
    let corners = |body: &Body, face: FaceKey| -> Vec<Vec3> {
        body.face_coedges(face)
            .iter()
            .filter_map(|coedge| body.coedge_vertices(*coedge))
            .filter_map(|(from, _)| Some(Vec3::from(body.vertices.get(from)?.point)))
            .collect()
    };
    let near = corners(a, one);
    let far = corners(b, other);
    if near.is_empty() || near.len() != far.len() {
        return false;
    }
    near.iter().all(|point| {
        far.iter()
            .any(|other| point.distance(*other) <= tolerance)
    }) && far.iter().all(|point| {
        near.iter()
            .any(|other| point.distance(*other) <= tolerance)
    })
}

/// Curves shared by a pair of faces.
struct Shared {
    curves: Vec<Curve3>,
    /// Loops of one body's face to copy whole into the other body's face:
    /// `(into a, the face there, the loop's own face, the loop)`.
    islands: Vec<(bool, FaceKey, FaceKey, LoopKey)>,
}

/// The curves one loop of a face's boundary runs along.
///
/// What cuts a partly shared wall into its shared and unshared parts. They
/// are used as whole curves rather than as the segments the edges cover, so
/// a boundary line may cut somewhere the edge itself does not reach — which
/// leaves an extra edge and never a different shape, since an imprint only
/// ever adds them.
///
/// Splines are the exception. A file keeps one intersection loop as several
/// edges, each with its own spline for the whole loop, fitted a little
/// differently; cutting with every one of them peels slivers off between
/// the copies. A run of spline edges is cut with once, as one spline through
/// the stretch the edges actually cover.
fn loop_curves(
    body: &Body,
    ring: LoopKey,
    reaching: &std::collections::HashSet<CoedgeKey>,
) -> Vec<Curve3> {
    const STEPS: usize = 64;
    let spline_edge = |coedge: &CoedgeKey| {
        let edge = body.coedges.get(*coedge).and_then(|coedge| body.edges.get(coedge.edge));
        edge.and_then(|edge| body.curves.get(edge.curve))
            .is_some_and(|curve| matches!(curve, Curve3::Nurbs(_)))
    };
    let mut out = Vec::new();
    let Some(ring) = body.loops.get(ring) else {
        return out;
    };
    // Start the walk past a spline run, so no run is split in two by
    // where the loop happens to begin.
    let start = ring.coedges.iter().position(|coedge| !spline_edge(coedge)).unwrap_or(0);
    let walk = ring.coedges[start..].iter().chain(&ring.coedges[..start]);
    // A loop of splines only comes back round to where it began.
    let closed = ring.coedges.iter().all(spline_edge);
    let mut run: Vec<[f64; 3]> = Vec::new();
    let flush = |run: &mut Vec<[f64; 3]>, out: &mut Vec<Curve3>| {
        // Evenly spaced: a cubic through points bunched on a tiny edge
        // overshoots between them by far more than any fit.
        let length: f64 = run
            .windows(2)
            .map(|pair| Vec3::from(pair[0]).distance(Vec3::from(pair[1])))
            .sum();
        let spacing = length / 256.0;
        let mut even: Vec<[f64; 3]> = Vec::with_capacity(run.len());
        for (index, point) in run.iter().enumerate() {
            let last = index + 1 == run.len();
            match even.last() {
                Some(kept)
                    if !last && Vec3::from(*kept).distance(Vec3::from(*point)) < spacing => {}
                Some(kept)
                    if last
                        && even.len() > 1
                        && Vec3::from(*kept).distance(Vec3::from(*point)) < spacing =>
                {
                    *even.last_mut().expect("checked") = *point;
                }
                _ => even.push(*point),
            }
        }
        *run = even;
        if run.len() >= 2 {
            if let Some(spline) =
                NurbsCurve3::interpolate_fit(run, None, None, Parameterization::Chord)
            {
                out.push(Curve3::Nurbs(spline.with_periodicity(closed)));
            }
        }
        run.clear();
    };
    for key in walk {
        let Some(coedge) = body.coedges.get(*key) else {
            continue;
        };
        let Some(edge) = body.edges.get(coedge.edge) else {
            continue;
        };
        let Some(curve) = body.curves.get(edge.curve) else {
            continue;
        };
        // An edge running only along the other face's boundary, or off it,
        // has nothing there to cut.
        if !reaching.contains(key) {
            flush(&mut run, &mut out);
            continue;
        }
        if !matches!(curve, Curve3::Nurbs(_)) {
            flush(&mut run, &mut out);
            out.push(curve.clone());
            continue;
        }
        let (from, to) = if coedge.forward {
            (edge.start_parameter, edge.end_parameter)
        } else {
            (edge.end_parameter, edge.start_parameter)
        };
        let skip = usize::from(!run.is_empty());
        run.extend((skip..=STEPS).map(|step| {
            curve.point_at(from + (to - from) * step as f64 / STEPS as f64)
        }));
    }
    flush(&mut run, &mut out);
    out
}

/// [`loop_walk`] with the coedge each point lies on.
fn loop_walk_of(
    body: &Body,
    coedges: &[CoedgeKey],
    samples: usize,
) -> Option<Vec<(CoedgeKey, Vec3, Vec3)>> {
    let mut out = Vec::new();
    for key in coedges {
        let coedge = body.coedges.get(*key)?;
        let edge = body.edges.get(coedge.edge)?;
        let curve = body.curves.get(edge.curve)?;
        let sense = if coedge.forward { 1.0 } else { -1.0 };
        for step in 0..samples {
            let t = (step as f64 + 0.5) / samples as f64;
            let parameter = if coedge.forward {
                edge.start_parameter + (edge.end_parameter - edge.start_parameter) * t
            } else {
                edge.end_parameter + (edge.start_parameter - edge.end_parameter) * t
            };
            let along = Vec3::from(curve.tangent_at(parameter)) * sense;
            out.push((*key, Vec3::from(curve.point_at(parameter)), along));
        }
    }
    Some(out)
}

/// Points along a loop with the way the loop runs at each, `samples` to an
/// edge.
fn loop_walk(body: &Body, ring: LoopKey, samples: usize) -> Option<Vec<(Vec3, Vec3)>> {
    let walk = loop_walk_of(body, &body.loops.get(ring)?.coedges, samples)?;
    Some(walk.into_iter().map(|(_, point, along)| (point, along)).collect())
}

/// Whether a loop of one face lies wholly inside another face on the same
/// surface, clear of its boundary, and closes there rather than going round
/// the surface — a slot's opening, not a rim.
fn island_fits(from: &Body, ring: LoopKey, into: &Body, face: FaceKey, tolerance: f64) -> bool {
    let Some(walk) = loop_walk(from, ring, 8) else {
        return false;
    };
    let Some(surface) = into.faces.get(face).and_then(|node| into.surfaces.get(node.surface))
    else {
        return false;
    };
    // A plane cuts cleanly along whole lines and circles; only on a curved
    // wall do they run on round it, far past the loop.
    if matches!(surface, Surface::Plane(_)) {
        return false;
    }
    let periods = super::pcurve::periods(surface);
    let mut previous: Option<[f64; 2]> = None;
    let mut first: Option<[f64; 2]> = None;
    for (point, _) in &walk {
        let Some((mut u, mut v)) = surface.parameters_at(point.to_array()) else {
            return false;
        };
        if let Some(last) = previous {
            if let Some(period) = periods[0] {
                u -= period * ((u - last[0]) / period).round();
            }
            if let Some(period) = periods[1] {
                v -= period * ((v - last[1]) / period).round();
            }
        }
        first.get_or_insert([u, v]);
        previous = Some([u, v]);
    }
    let (Some(first), Some(last)) = (first, previous) else {
        return false;
    };
    let wraps = periods
        .iter()
        .zip([first[0] - last[0], first[1] - last[1]])
        .any(|(period, gap)| period.is_some_and(|period| gap.abs() > period * 0.5));
    if wraps {
        return false;
    }
    // Clear of the face's own edges, by more than a hair.
    let edges: Vec<Vec<Vec3>> = into
        .face_coedges(face)
        .iter()
        .filter_map(|coedge| {
            let edge = into.edges.get(into.coedges.get(*coedge)?.edge)?;
            let curve = into.curves.get(edge.curve)?;
            Some(
                (0..=64)
                    .map(|step| {
                        Vec3::from(curve.point_at(
                            edge.start_parameter
                                + (edge.end_parameter - edge.start_parameter) * step as f64
                                    / 64.0,
                        ))
                    })
                    .collect(),
            )
        })
        .collect();
    let clear = tolerance * 1e3;
    let fit = loop_fit(&walk, tolerance);
    walk.iter().all(|(point, _)| {
        super::classify::face_distance(into, face, point.to_array(), fit)
            .is_some_and(|gap| gap <= fit)
            && edges.iter().all(|edge| {
                edge.windows(2)
                    .all(|pair| point.distance_to_segment(pair[0], pair[1]) > clear)
            })
    })
}

/// Whether any of a loop comes onto another face — the only place its
/// curves have anything to cut there.
fn loop_reaches(from: &Body, ring: LoopKey, into: &Body, face: FaceKey, tolerance: f64) -> bool {
    let Some(walk) = loop_walk(from, ring, 8) else {
        return true;
    };
    let fit = loop_fit(&walk, tolerance);
    // Touching the face's own edges is not reaching into it: gear teeth in
    // mesh meet along a line on a shared plane and overlap nowhere.
    let edges = edge_samples(into, face);
    walk.iter().any(|(point, _)| {
        super::classify::face_distance(into, face, point.to_array(), fit)
            .is_none_or(|gap| gap <= fit)
            && edges.iter().all(|edge| {
                edge.windows(2)
                    .all(|pair| point.distance_to_segment(pair[0], pair[1]) > fit * 10.0)
            })
    })
}

/// The coedges of a loop that run strictly inside another face somewhere.
fn edges_reaching(
    from: &Body,
    ring: LoopKey,
    into: &Body,
    face: FaceKey,
    tolerance: f64,
) -> std::collections::HashSet<CoedgeKey> {
    let mut out = std::collections::HashSet::new();
    let Some(ring) = from.loops.get(ring) else {
        return out;
    };
    let Some(walk) = loop_walk_of(from, &ring.coedges, 8) else {
        return out;
    };
    let points: Vec<(Vec3, Vec3)> = walk.iter().map(|(_, point, along)| (*point, *along)).collect();
    let fit = loop_fit(&points, tolerance);
    let edges = edge_samples(into, face);
    for (coedge, point, _) in walk {
        if out.contains(&coedge) {
            continue;
        }
        let on_face = super::classify::face_distance(into, face, point.to_array(), fit)
            .is_none_or(|gap| gap <= fit);
        let clear = edges.iter().all(|edge| {
            edge.windows(2)
                .all(|pair| point.distance_to_segment(pair[0], pair[1]) > fit * 10.0)
        });
        if on_face && clear {
            out.insert(coedge);
        }
    }
    out
}

/// Points along each edge of a face, for distances to its boundary.
fn edge_samples(body: &Body, face: FaceKey) -> Vec<Vec<Vec3>> {
    body.face_coedges(face)
        .iter()
        .filter_map(|coedge| {
            let edge = body.edges.get(body.coedges.get(*coedge)?.edge)?;
            let curve = body.curves.get(edge.curve)?;
            Some(
                (0..=16)
                    .map(|step| {
                        Vec3::from(curve.point_at(
                            edge.start_parameter
                                + (edge.end_parameter - edge.start_parameter) * step as f64
                                    / 16.0,
                        ))
                    })
                    .collect(),
            )
        })
        .collect()
}

/// How far a file's loop may stand off the surface it bounds: its splines
/// are fits, good to a small part of the loop's size, not to the modelling
/// tolerance.
fn loop_fit(walk: &[(Vec3, Vec3)], tolerance: f64) -> f64 {
    let extent = walk
        .iter()
        .map(|(point, _)| point.distance(walk[0].0))
        .fold(0.0, f64::max);
    tolerance.max(extent * 1e-4)
}

/// Copies a loop of `from` into `face` of `body` as an island: the loop
/// becomes a hole in the face and the boundary of a new face inside it, on
/// the same surface, wound so each keeps its own side.
fn copy_island(
    body: &mut Body,
    face: FaceKey,
    from: &Body,
    ring: LoopKey,
) -> Option<FaceKey> {
    let node = body.faces.get(face)?.clone();
    let surface = body.surfaces.get(node.surface)?.clone();
    let walk = loop_walk(from, ring, 4)?;
    // Which way round the loop runs about the face's own normal: inward on
    // the left of its way is an outer boundary's sense.
    let count = walk.len() as f64;
    let centre = walk.iter().fold(Vec3::new(0.0, 0.0, 0.0), |sum, (point, _)| sum + *point)
        * (1.0 / count);
    let sense = if node.forward { 1.0 } else { -1.0 };
    let turning: f64 = walk
        .iter()
        .filter_map(|(point, along)| {
            let (u, v) = surface.parameters_at(point.to_array())?;
            let normal = Vec3::from(surface.normal_at(u, v)?) * sense;
            Some(normal.cross(*along).dot(centre - *point))
        })
        .sum();
    let outer = turning > 0.0;

    let source = from.loops.get(ring)?.coedges.clone();
    let mut vertices: std::collections::HashMap<VertexKey, VertexKey> = Default::default();
    let mut vertex = |body: &mut Body, key: VertexKey| -> Option<VertexKey> {
        if let Some(made) = vertices.get(&key) {
            return Some(*made);
        }
        let made = body.vertices.insert(Vertex {
            point: from.vertices.get(key)?.point,
            provenance: Provenance::Synthesized,
        });
        vertices.insert(key, made);
        Some(made)
    };
    let island_ring = body.loops.insert(Loop {
        coedges: Vec::new(),
        owner: face,
        provenance: Provenance::Synthesized,
    });
    let hole_ring = body.loops.insert(Loop {
        coedges: Vec::new(),
        owner: face,
        provenance: Provenance::Synthesized,
    });
    let island = body.faces.insert(Face {
        surface: node.surface,
        forward: node.forward,
        loops: vec![island_ring],
        owner: node.owner,
        provenance: Provenance::Synthesized,
    });
    body.loops.get_mut(island_ring)?.owner = island;
    let (mut island_coedges, mut hole_coedges) = (Vec::new(), Vec::new());
    for key in &source {
        let coedge = from.coedges.get(*key)?;
        let edge = from.edges.get(coedge.edge)?;
        let curve = body.curves.insert(from.curves.get(edge.curve)?.clone());
        let (start, end) = (vertex(body, edge.start)?, vertex(body, edge.end)?);
        let made = body.edges.insert(Edge {
            curve,
            start_parameter: edge.start_parameter,
            end_parameter: edge.end_parameter,
            start,
            end,
            coedges: Vec::new(),
            provenance: Provenance::Synthesized,
        });
        // The island runs the loop the way that bounds it; the hole the
        // other way.
        let along = coedge.forward == outer;
        let island_use = body.coedges.insert(Coedge {
            edge: made,
            forward: along,
            pcurve: None,
            owner: island_ring,
            provenance: Provenance::Synthesized,
        });
        let hole_use = body.coedges.insert(Coedge {
            edge: made,
            forward: !along,
            pcurve: None,
            owner: hole_ring,
            provenance: Provenance::Synthesized,
        });
        body.edges.get_mut(made)?.coedges = vec![island_use, hole_use];
        island_coedges.push(island_use);
        hole_coedges.push(hole_use);
    }
    if !outer {
        island_coedges.reverse();
    } else {
        hole_coedges.reverse();
    }
    body.loops.get_mut(island_ring)?.coedges = island_coedges;
    body.loops.get_mut(hole_ring)?.coedges = hole_coedges;
    body.shells.get_mut(node.owner)?.faces.push(island);
    // The face's own holes inside the island are the island's holes now.
    let inner: Vec<LoopKey> = node
        .loops
        .iter()
        .skip(1)
        .copied()
        .filter(|ring| {
            loop_walk(body, *ring, 2).is_some_and(|walk| {
                let fit = loop_fit(&walk, 1e-9);
                walk.first().is_some_and(|(point, _)| {
                    super::classify::face_distance(body, island, point.to_array(), fit)
                        .is_some_and(|gap| gap <= fit)
                })
            })
        })
        .collect();
    for ring in &inner {
        body.loops.get_mut(*ring)?.owner = island;
    }
    body.faces.get_mut(island)?.loops.extend(inner.iter().copied());
    let kept = body.faces.get_mut(face)?;
    kept.loops.retain(|ring| !inner.contains(ring));
    kept.loops.push(hole_ring);
    kept.provenance.soil();
    Some(island)
}

/// The stretch of a line inside both boxes, widened a little so it still
/// crosses the faces' edges, as a straight spline. `None` when it misses.
fn clipped_line(line: &super::geometry::Line3, near: &Aabb, far: &Aabb) -> Option<Curve3> {
    let low: [f64; 3] = std::array::from_fn(|axis| near.min[axis].max(far.min[axis]));
    let high: [f64; 3] = std::array::from_fn(|axis| near.max[axis].min(far.max[axis]));
    let margin = Vec3::from(low).distance(Vec3::from(high)) * 0.01 + 1e-6;
    let (mut from, mut to) = (f64::NEG_INFINITY, f64::INFINITY);
    for axis in 0..3 {
        let (start, along) = (line.origin[axis], line.direction[axis]);
        let (low, high) = (low[axis] - margin, high[axis] + margin);
        if along.abs() <= f64::EPSILON {
            if start < low || start > high {
                return None;
            }
            continue;
        }
        let (a, b) = ((low - start) / along, (high - start) / along);
        from = from.max(a.min(b));
        to = to.min(a.max(b));
    }
    if !(from < to) {
        return None;
    }
    let at = |t: f64| (Vec3::from(line.origin) + Vec3::from(line.direction) * t).to_array();
    NurbsCurve3::new_strict(1, vec![at(from), at(to)], vec![from, from, to, to], vec![1.0, 1.0])
        .map(Curve3::Nurbs)
}

/// Every curve the two bodies' faces share.
fn shared_curves(a: &Body, b: &Body, tolerance: f64) -> Result<Vec<Shared>, Snag> {
    let near: Vec<(FaceKey, Option<Aabb>)> =
        a.face_keys().map(|key| (key, face_bounds(a, key))).collect();
    let far: Vec<(FaceKey, Option<Aabb>)> =
        b.face_keys().map(|key| (key, face_bounds(b, key))).collect();

    let mut out = Vec::new();
    let mut soups = None;
    let mut marched: Vec<(Surface, Surface, Vec<Vec<Vec3>>)> = Vec::new();
    for (one, one_box) in &near {
        for (other, other_box) in &far {
            // A box that could not be computed means "cannot exclude", so
            // the pair is tested rather than skipped.
            if let (Some(first), Some(second)) = (one_box, other_box) {
                if !first.grown(tolerance).overlaps(second) {
                    continue;
                }
            }
            let (Some(one_face), Some(other_face)) = (a.faces.get(*one), b.faces.get(*other))
            else {
                continue;
            };
            let (Some(one_surface), Some(other_surface)) = (
                a.surfaces.get(one_face.surface),
                b.surfaces.get(other_face.surface),
            ) else {
                continue;
            };
            match surfaces(one_surface, other_surface, tolerance) {
                Meeting::None | Meeting::Points(_) => {}
                // A line two curved faces share runs on for ever, and cut as
                // one it divides faces of either body far from where the
                // two meet — a slot's side, run down the whole of the hole
                // and the shaft in it. Only the stretch where both faces
                // are is kept.
                Meeting::Curves(curves) => {
                    // Surfaces that meet, faces that may not: boxes overlap
                    // round many pairs whose faces stay well apart, and the
                    // whole curves of those would cut both bodies for
                    // nothing.
                    let soups = soups.get_or_insert_with(|| {
                        (
                            super::near::FaceSoups::of(a, tolerance),
                            super::near::FaceSoups::of(b, tolerance),
                        )
                    });
                    if super::near::apart(&soups.0, *one, &soups.1, *other, tolerance) {
                        continue;
                    }
                    let curved = !matches!(one_surface, Surface::Plane(_))
                        || !matches!(other_surface, Surface::Plane(_));
                    let curves = curves
                        .into_iter()
                        .filter_map(|curve| match (&curve, one_box, other_box, curved) {
                            (Curve3::Line(line), Some(near), Some(far), true) => {
                                clipped_line(line, near, far)
                            }
                            _ => Some(curve),
                        })
                        .collect();
                    out.push(Shared { curves, islands: Vec::new() });
                }
                // Two faces on one surface. Where they cover exactly the same
                // ground there is nothing to imprint — the boolean decides
                // which copy of the shared wall survives from the two
                // normals.
                //
                // Where one covers more than the other, what separates the
                // shared part from the rest is the *other face's own
                // boundary*, already sitting in the shared plane. Cutting
                // each along it is the imprint: afterwards every piece is
                // either the whole of a shared wall or none of one, which is
                // the only case the boolean has an answer for.
                Meeting::Coincident => {
                    // Coplanar is not the same as overlapping: two boxes
                    // stacked face to face have four pairs of side walls on
                    // one plane each, meeting along a line and sharing no
                    // area at all. Only a genuine overlap has anything to
                    // decide.
                    if overlap(a, *one, b, *other, tolerance)
                        && !same_ground(a, *one, b, *other, tolerance)
                    {
                        // A loop of one face lying wholly inside the other —
                        // a slot's opening in a hole wall, over the shaft in
                        // it — is copied across as it is, corners and all.
                        // Its curves would cut the other face only as whole
                        // lines and loops running on far past the opening.
                        let mut curves = Vec::new();
                        let mut islands = Vec::new();
                        for (from, from_face, into, into_face, into_a) in
                            [(&*a, *one, &*b, *other, false), (&*b, *other, &*a, *one, true)]
                        {
                            let rings = from
                                .faces
                                .get(from_face)
                                .map(|node| node.loops.clone())
                                .unwrap_or_default();
                            for ring in &rings {
                                if island_fits(from, *ring, into, into_face, tolerance) {
                                    islands.push((into_a, into_face, from_face, *ring));
                                } else if loop_reaches(from, *ring, into, into_face, tolerance) {
                                    let reaching =
                                        edges_reaching(from, *ring, into, into_face, tolerance);
                                    curves.extend(loop_curves(from, *ring, &reaching));
                                }
                            }
                        }
                        let loopless = [(&*a, *one), (&*b, *other)].iter().all(|(body, face)| {
                            body.faces.get(*face).is_some_and(|node| node.loops.is_empty())
                        });
                        if loopless {
                            return Err(Snag::Coincident);
                        }
                        // Boxes that overlap round faces that do not: nothing
                        // of either reaches the other.
                        if !curves.is_empty() || !islands.is_empty() {
                            out.push(Shared { curves, islands });
                        }
                    }
                }
                // No closed form for the pair. Their meshes may still show
                // the two faces never come near; where they do cross, the
                // crossing is traced onto both surfaces instead.
                Meeting::Unknown => {
                    let soups = soups.get_or_insert_with(|| {
                        (
                            super::near::FaceSoups::of(a, tolerance),
                            super::near::FaceSoups::of(b, tolerance),
                        )
                    });
                    if super::near::apart(&soups.0, *one, &soups.1, *other, tolerance) {
                        continue;
                    }
                    let known = match marched
                        .iter()
                        .position(|(s, t, _)| s == one_surface && t == other_surface)
                    {
                        Some(index) => index,
                        None => {
                            marched.push((
                                one_surface.clone(),
                                other_surface.clone(),
                                Vec::new(),
                            ));
                            marched.len() - 1
                        }
                    };
                    let curves = soups
                        .0
                        .triangles(*one)
                        .zip(soups.1.triangles(*other))
                        .and_then(|(first, second)| {
                            super::march::traced(
                                one_surface,
                                first,
                                other_surface,
                                second,
                                &mut marched[known].2,
                                tolerance,
                            )
                        })
                        .ok_or(Snag::NoClosedForm)?;
                    let curves = curves
                        .into_iter()
                        .flat_map(|curve| {
                            along_edges(a, &curve, tolerance)
                                .or_else(|| along_edges(b, &curve, tolerance))
                                .unwrap_or_else(|| vec![curve])
                        })
                        .collect();
                    out.push(Shared { curves, islands: Vec::new() });
                }
            }
        }
    }
    Ok(out)
}

/// The curves of a body's own edges that a traced curve runs along, if it
/// runs along them all the way. A shaft fitted in a hole meets the hole's
/// fillet where the hole already does, along an edge the file saved as a
/// spline: the traced curve is that edge again, a fit apart, and cutting
/// with both peels hairline slivers off between them. The edge's own curve
/// cuts the same and agrees with the vertices already there.
fn along_edges(body: &Body, curve: &Curve3, tolerance: f64) -> Option<Vec<Curve3>> {
    const SAMPLES: usize = 16;
    let Curve3::Nurbs(spline) = curve else {
        return None;
    };
    let (start, end) = spline.domain();
    let points: Vec<Vec3> = (0..=SAMPLES)
        .map(|index| {
            Vec3::from(curve.point_at(start + (end - start) * index as f64 / SAMPLES as f64))
        })
        .collect();
    let extent = points
        .iter()
        .map(|point| point.distance(points[0]))
        .fold(0.0, f64::max);
    let fit = tolerance.max(extent * 1e-3);
    let reach = |samples: &[Vec3]| {
        let low = samples.iter().fold(samples[0], |low, p| {
            Vec3::new(low.x.min(p.x), low.y.min(p.y), low.z.min(p.z))
        });
        let high = samples.iter().fold(samples[0], |high, p| {
            Vec3::new(high.x.max(p.x), high.y.max(p.y), high.z.max(p.z))
        });
        (low, high)
    };
    let (low, high) = reach(&points);
    // Only edges near the curve at all are worth the nearest-point search.
    let edges: Vec<&Curve3> = body
        .edges
        .iter()
        .filter_map(|(_, edge)| {
            let curve = body.curves.get(edge.curve)?;
            let samples: Vec<Vec3> = (0..=8)
                .map(|index| {
                    Vec3::from(curve.point_at(
                        edge.start_parameter
                            + (edge.end_parameter - edge.start_parameter) * index as f64 / 8.0,
                    ))
                })
                .collect();
            let (edge_low, edge_high) = reach(&samples);
            let margin = edge_low.distance(edge_high) * 0.25 + fit;
            let apart = edge_low.x > high.x + margin
                || edge_low.y > high.y + margin
                || edge_low.z > high.z + margin
                || edge_high.x < low.x - margin
                || edge_high.y < low.y - margin
                || edge_high.z < low.z - margin;
            (!apart).then_some(curve)
        })
        .collect();
    let mut used = vec![false; edges.len()];
    for point in &points {
        // Along the edge's whole curve, not just its span: a file keeps the
        // whole of an intersection loop as the curve of the part its face
        // still has, and the rest of the loop is the same curve again.
        let nearest = edges.iter().position(|edge| {
            Vec3::from(edge.point_at(edge.parameter_at(point.to_array()))).distance(*point) <= fit
        })?;
        used[nearest] = true;
    }
    let mut out: Vec<Curve3> = Vec::new();
    for (edge, used) in edges.into_iter().zip(used) {
        if used && !out.contains(edge) {
            out.push(edge.clone());
        }
    }
    Some(out)
}

/// A box round a bounded curve; `None` for a line, which has no end.
fn curve_bounds(curve: &Curve3) -> Option<Aabb> {
    match curve {
        Curve3::Circle(circle) => {
            let r = circle.radius.abs();
            let c = circle.plane.origin;
            Aabb::around([[c[0] - r, c[1] - r, c[2] - r], [c[0] + r, c[1] + r, c[2] + r]])
        }
        Curve3::Ellipse(ellipse) => {
            let r = ellipse.major_radius.abs().max(ellipse.minor_radius.abs());
            let c = ellipse.plane.origin;
            Aabb::around([[c[0] - r, c[1] - r, c[2] - r], [c[0] + r, c[1] + r, c[2] + r]])
        }
        // Positive weights keep a spline inside its control hull.
        Curve3::Nurbs(spline) if spline.weights().iter().all(|weight| *weight > 0.0) => {
            Aabb::around(spline.control_points().iter().copied())
        }
        _ => None,
    }
}

/// Cuts every face of `body` that one of `curves` crosses.
///
/// A face split in two may still be crossed by the next curve, and by the
/// same one where a curve enters and leaves more than once, so the halves go
/// back into the list to be tried again.
fn cut_along(body: &mut Body, curves: &[Curve3], tolerance: f64) -> Result<usize, Snag> {
    let mut cuts = 0;
    for curve in curves {
        // Only a face whose box the curve reaches can it cut; trying the
        // others copies the whole body for nothing.
        let reach = curve_bounds(curve).map(|bounds| bounds.grown(tolerance * 10.0));
        let mut pending: Vec<FaceKey> = body
            .face_keys()
            .filter(|face| match (&reach, face_bounds(body, *face)) {
                (Some(reach), Some(bounds)) => reach.overlaps(&bounds),
                _ => true,
            })
            .collect();
        // Each cut adds at most one face, so the work is bounded by however
        // many faces the curve can produce. The cap is a backstop against a
        // cut that somehow keeps splitting the same face rather than a limit
        // anything real reaches.
        let ceiling = body.faces.len() * 4 + 16;
        let mut done = 0;
        while let Some(face) = pending.pop() {
            done += 1;
            if done > ceiling {
                return Err(Snag::CutRefused);
            }
            if !body.faces.contains(face) {
                continue;
            }
            if let Some([kept, made]) = split_face(body, face, curve, tolerance) {
                cuts += 1;
                pending.push(kept);
                pending.push(made);
            }
        }
    }
    Ok(cuts)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::brep::make::cuboid;

    const TOL: f64 = 1e-9;

    /// Two boxes overlapping in a corner.
    fn overlapping() -> (Body, Body) {
        (
            cuboid([0.0; 3], [10.0, 10.0, 10.0]).unwrap(),
            cuboid([5.0, 5.0, 5.0], [10.0, 10.0, 10.0]).unwrap(),
        )
    }

    #[test]
    fn imprinting_leaves_both_bodies_consistent() {
        let (mut a, mut b) = overlapping();
        imprint(&mut a, &mut b, TOL).expect("two boxes meet in planes");
        for (name, body) in [("a", &a), ("b", &b)] {
            let flaws = body.validate();
            assert!(flaws.is_empty(), "{name}: {flaws:?}");
            assert_eq!(body.euler_characteristic(), 2, "{name}");
        }
    }

    #[test]
    fn imprinting_adds_edges_and_faces_but_no_volume() {
        // An imprint only writes the shape down differently.
        let (mut a, mut b) = overlapping();
        let before = crate::brep::body_bounds(&a).unwrap();
        let faces = a.faces.len();
        let result = imprint(&mut a, &mut b, TOL).unwrap();
        assert!(result.cuts > 0, "the boxes overlap, so something is cut");
        assert!(a.faces.len() > faces);
        let after = crate::brep::body_bounds(&a).unwrap();
        assert_eq!(before, after, "the solid did not move or grow");
    }

    #[test]
    fn every_piece_is_wholly_in_or_wholly_out_afterwards() {
        // The property the whole step exists for. Before the imprint, the
        // faces of A that the corner of B passes through are partly inside
        // it; afterwards no face is.
        use crate::brep::{contains_point, Containment};
        let (mut a, mut b) = overlapping();
        imprint(&mut a, &mut b, TOL).unwrap();
        for face in a.face_keys() {
            let bounds = crate::brep::face_bounds(&a, face).unwrap();
            let mut seen = Vec::new();
            // The corners of the face's own box, nudged onto the face, are
            // enough to catch a face that straddles the boundary.
            for coedge in a.face_coedges(face) {
                let Some((from, _)) = a.coedge_vertices(coedge) else {
                    continue;
                };
                let point = a.vertices.get(from).unwrap().point;
                seen.push(contains_point(&b, point, 1e-6));
            }
            let _ = bounds;
            let inside = seen.iter().filter(|c| **c == Containment::Inside).count();
            let outside = seen.iter().filter(|c| **c == Containment::Outside).count();
            assert!(
                inside == 0 || outside == 0,
                "face {face:?} has corners both in and out: {seen:?}"
            );
        }
    }

    #[test]
    fn boxes_that_do_not_touch_are_left_alone() {
        let mut a = cuboid([0.0; 3], [1.0, 1.0, 1.0]).unwrap();
        let mut b = cuboid([50.0, 50.0, 50.0], [1.0, 1.0, 1.0]).unwrap();
        let faces = (a.faces.len(), b.faces.len());
        let result = imprint(&mut a, &mut b, TOL).unwrap();
        assert_eq!(result.cuts, 0);
        assert_eq!((a.faces.len(), b.faces.len()), faces);
    }

    #[test]
    fn faces_meeting_on_one_plane_need_nothing_when_they_cover_it_alike() {
        // Stacked exactly: the two that meet cover the same ground and the
        // four pairs of side walls share a plane without sharing any area.
        // Neither needs cutting, so there is nothing to imprint.
        let mut a = cuboid([0.0; 3], [10.0, 10.0, 10.0]).unwrap();
        let mut b = cuboid([0.0, 0.0, 10.0], [10.0, 10.0, 10.0]).unwrap();
        let result = imprint(&mut a, &mut b, TOL).expect("nothing to cut");
        assert_eq!(result.cuts, 0);
    }

    #[test]
    fn a_wall_shared_in_part_is_cut_where_the_sharing_stops() {
        // A smaller box on top: its bottom covers a corner of the other's
        // top. What separates the shared part from the rest is the small
        // box's own boundary, so cutting the big face along it leaves pieces
        // that are each wholly shared or wholly not — which is the only
        // shape the boolean has an answer for.
        let mut a = cuboid([0.0; 3], [10.0, 10.0, 10.0]).unwrap();
        let mut b = cuboid([0.0, 0.0, 10.0], [4.0, 4.0, 4.0]).unwrap();
        let before = (a.faces.len(), b.faces.len());
        let result = imprint(&mut a, &mut b, TOL).expect("a wall to cut");
        assert!(result.cuts > 0, "{result:?}");
        assert!(a.faces.len() > before.0, "the big face was divided");
        assert_eq!(b.faces.len(), before.1, "the small one had nothing to lose");
        // An imprint only adds edges, so both are still solids.
        assert!(a.validate().is_empty());
        assert!(b.validate().is_empty());
        assert_eq!(a.euler_characteristic(), 2);
        assert_eq!(b.euler_characteristic(), 2);

        // And the piece that matches the small box's footprint really is one
        // face now, rather than a corner of a larger one.
        let footprint = a.face_keys().filter(|face| {
            face_bounds(&a, *face).is_some_and(|box_| {
                (box_.min[2] - 10.0).abs() < TOL
                    && (box_.max[0] - 4.0).abs() < TOL
                    && (box_.max[1] - 4.0).abs() < TOL
                    && box_.min[0].abs() < TOL
                    && box_.min[1].abs() < TOL
            })
        });
        assert_eq!(footprint.count(), 1);
    }

    #[test]
    fn a_pair_with_no_closed_form_is_refused() {
        let mut a = cuboid([0.0; 3], [10.0, 10.0, 10.0]).unwrap();
        let mut b = cuboid([5.0; 3], [10.0, 10.0, 10.0]).unwrap();
        // Turn one of B's faces into a torus, which no pair here can meet.
        let face = b.face_keys().next().unwrap();
        let surface = b.faces.get(face).unwrap().surface;
        *b.surfaces.get_mut(surface).unwrap() =
            crate::brep::Surface::Torus(crate::brep::Torus {
                frame: crate::space::Plane::XY,
                major_radius: 4.0,
                minor_radius: 1.0,
            });
        assert_eq!(imprint(&mut a, &mut b, TOL), Err(Snag::NoClosedForm));
    }

    #[test]
    fn the_prefilter_does_not_lose_a_real_meeting() {
        // Boxes that share only an edge region: most face pairs are apart,
        // and the box test has to keep the few that are not.
        let (mut a, mut b) = overlapping();
        let result = imprint(&mut a, &mut b, TOL).unwrap();
        assert!(result.meetings > 0);
        assert!(
            result.meetings < 36,
            "the prefilter rejected nothing: {}",
            result.meetings
        );
    }

    #[test]
    fn imprinting_at_survey_coordinates_works_the_same() {
        let origin = [512_345.678, 4_512_345.678, 91.5];
        let mut a = cuboid(origin, [10.0, 10.0, 10.0]).unwrap();
        let mut b = cuboid(
            [origin[0] + 5.0, origin[1] + 5.0, origin[2] + 5.0],
            [10.0, 10.0, 10.0],
        )
        .unwrap();
        imprint(&mut a, &mut b, 1e-6).expect("the same two boxes, further out");
        assert!(a.validate().is_empty());
        assert!(b.validate().is_empty());
        assert!(a.worst_vertex_gap() < 1e-6);
    }
}
