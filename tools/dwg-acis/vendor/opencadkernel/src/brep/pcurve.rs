//! A space curve seen in a surface's own coordinates.
//!
//! Splitting a face is a two-dimensional problem. The face is a region of its
//! surface's `(u, v)` space bounded by loops; the curve that cuts it is
//! another set of `(u, v)` points; and what has to happen — where they cross,
//! which pieces the cut leaves, which side of the cut a piece is on — is
//! exactly what [`geom2d`](crate::geom2d) answers. So the last step before a
//! boolean can do anything is bringing the curve down into that space.
//!
//! ACIS calls the result a pcurve and stores one on every coedge, for the
//! same reason.
//!
//! # Parameters do not carry across
//!
//! The result traces the same *points* as the space curve, not the same
//! parameter values: a circle in space is parameterised by angle here and by
//! a fraction of a turn in [`geom2d`]. A caller needing the other curve's
//! parameter goes through the point, which both kinds invert exactly.
//! Inventing a mapping type to carry the difference would put a conversion in
//! every signature to save one call at a handful of sites.
//!
//! # Where the projection does not exist
//!
//! On a cylinder, a slanted plane's section is a sine wave in `(u, v)` — no
//! [`Curve`] variant is one, and calling it a spline would be an
//! approximation dressed as a fact. Those cases answer `None`, on the same
//! principle as [`Meeting::Unknown`](super::Meeting): a caller told nothing
//! can refuse, a caller told something wrong cannot.

use super::geometry::{Curve3, Surface};
use crate::geom2d::{
    Arc, Circle, Curve, Ellipse, EllipseArc, Line, Polyline, PolylineVertex, XLine,
};
use crate::space::Vec3;
use std::f64::consts::TAU;

/// The curve `curve` traces in `surface`'s parameter space.
///
/// `None` when the curve does not lie on the surface, and when the shape it
/// traces there is not one this kernel can write down.
pub fn project(surface: &Surface, curve: &Curve3, tolerance: f64) -> Option<Curve> {
    // A curve that is not on the surface has no image in its parameter
    // space, and projecting it anyway would produce a plausible shape in the
    // wrong place. Sampled rather than reasoned about per pair: the check is
    // the same for every combination and cheap next to what follows.
    if !lies_on(surface, curve, tolerance) {
        return None;
    }
    // A spline edge — an intersection a file saved as one — has no closed
    // image on an analytic surface, and without one the face had no
    // boundary at all: no point could be placed in or out of a solid with a
    // hex socket, so every boolean against it was refused (#1563). Its
    // image is walked instead, which `trim_to` redoes over the edge's own
    // span, the same way a general circle on a sphere is kept.
    if matches!(curve, Curve3::Nurbs(_)) {
        return sampled_image(surface, curve);
    }
    match surface {
        Surface::Plane(plane) => match curve {
            Curve3::Line(line) => Some(Curve::XLine(XLine {
                base: plane.project(line.origin)?,
                direction: plane.project_vector(line.direction)?,
            })),
            Curve3::Circle(circle) => Some(Curve::Circle(Circle {
                centre: plane.project(circle.plane.origin)?,
                radius: circle.radius,
            })),
            Curve3::Ellipse(ellipse) => {
                let major = plane.project_vector(ellipse.plane.x_axis)?;
                let length = major[0].hypot(major[1]);
                if length <= tolerance {
                    return None;
                }
                Some(Curve::Ellipse(EllipseArc {
                    ellipse: Ellipse {
                        centre: plane.project(ellipse.plane.origin)?,
                        major_radius: ellipse.major_radius,
                        minor_radius: ellipse.minor_radius,
                        major_axis: [major[0] / length, major[1] / length],
                    },
                    start_parameter: 0.0,
                    end_parameter: TAU,
                }))
            }
            // Already a plane curve; it only has to be re-expressed in this
            // plane's coordinates rather than its own.
            Curve3::PlanarSpline { curve, .. } => Some(Curve::Nurbs(curve.clone())),
            Curve3::Nurbs(_) => None,
        },

        // On a cylinder `u` runs round and `v` along the axis, so the two
        // curves that stay straight there are the ones aligned with it: a
        // circle at one height, and a generator. A slanted section is a sine
        // wave, which is why the general case is absent rather than
        // approximated.
        Surface::Cylinder(cylinder) => match curve {
            Curve3::Circle(circle) => {
                let axis = Vec3::from(cylinder.base.normal()?);
                let plane_normal = Vec3::from(circle.plane.normal()?);
                if !plane_normal.is_parallel_to(axis, tolerance) {
                    return None;
                }
                let height = (Vec3::from(circle.plane.origin)
                    - Vec3::from(cylinder.base.origin))
                .dot(axis);
                Some(band_at(height))
            }
            Curve3::Line(line) => {
                let axis = Vec3::from(cylinder.base.normal()?);
                if !Vec3::from(line.direction).is_parallel_to(axis, tolerance) {
                    return None;
                }
                Some(generator_at(angle_about(
                    &cylinder.base,
                    line.origin,
                )?))
            }
            _ => None,
        },

        // The same two shapes on a cone, with `v` measured along the axis as
        // it is for a cylinder.
        Surface::Cone(cone) => match curve {
            Curve3::Circle(circle) => {
                let axis = Vec3::from(cone.base.normal()?);
                let plane_normal = Vec3::from(circle.plane.normal()?);
                if !plane_normal.is_parallel_to(axis, tolerance) {
                    return None;
                }
                let height =
                    (Vec3::from(circle.plane.origin) - Vec3::from(cone.base.origin)).dot(axis);
                Some(band_at(height))
            }
            Curve3::Line(line) => {
                // A generator leans by the half-angle, so it is not parallel
                // to the axis; what identifies it is that it keeps one angle
                // all the way along.
                let start = angle_about(&cone.base, line.origin)?;
                let further = angle_about(
                    &cone.base,
                    (Vec3::from(line.origin) + Vec3::from(line.direction)).to_array(),
                )?;
                let turn = (further - start).abs();
                if turn.min(TAU - turn) > tolerance {
                    return None;
                }
                Some(generator_at(start))
            }
            _ => None,
        },

        // A torus closes both ways, so both families of circles on it are
        // straight in `(u, v)`: the parallels, which run round the ring at
        // one place on the tube, and the meridians, which run round the tube
        // at one place on the ring. Between them they are every edge a
        // revolution puts on one. Anything else — a circle cutting across
        // both — is a quartic's section and has no closed form here.
        Surface::Torus(torus) => match curve {
            Curve3::Circle(circle) => {
                let axis = Vec3::from(torus.frame.normal()?);
                let plane_normal = Vec3::from(circle.plane.normal()?);
                let offset = Vec3::from(circle.plane.origin) - Vec3::from(torus.frame.origin);
                if plane_normal.is_parallel_to(axis, tolerance) {
                    // A parallel. Where it sits round the tube is fixed by
                    // how far out and how high it is — read the way
                    // `parameters_at` reads it, through the minor radius's
                    // sign: a torus stored with a negative one (a concave
                    // fillet) otherwise put every parallel half a turn round
                    // the tube, where a cut that missed the face fell inside
                    // it (#1563).
                    let sign = torus.minor_radius.signum();
                    Some(band_at(
                        (offset.dot(axis) * sign)
                            .atan2((circle.radius - torus.major_radius) * sign),
                    ))
                } else if plane_normal.dot(axis).abs() <= tolerance {
                    Some(meridian_at(angle_about(&torus.frame, circle.plane.origin)?))
                } else {
                    None
                }
            }
            _ => None,
        },

        // A latitude is straight in a sphere's `(u, v)` space. This is the
        // exact pcurve needed when a plane perpendicular to the sphere axis
        // cuts it, including the equator used by coaxial round solids. Other
        // circles can cross the longitude seam or a pole and need a general
        // spherical pcurve representation rather than being guessed here.
        Surface::Sphere(sphere) => match curve {
            Curve3::Circle(circle) => {
                let axis = Vec3::from(sphere.frame.normal()?);
                let plane_normal = Vec3::from(circle.plane.normal()?);
                if plane_normal.is_parallel_to(axis, tolerance) {
                    let height = (Vec3::from(circle.plane.origin)
                        - Vec3::from(sphere.frame.origin))
                    .dot(axis);
                    if height.abs() > sphere.radius + tolerance {
                        return None;
                    }
                    return Some(band_at(
                        (height / sphere.radius).clamp(-1.0, 1.0).asin(),
                    ));
                }
                let centred = Vec3::from(circle.plane.origin)
                    .distance(Vec3::from(sphere.frame.origin))
                    <= tolerance;
                let meridian = plane_normal.dot(axis).abs() <= tolerance
                    && centred
                    && (circle.radius - sphere.radius).abs() <= tolerance;
                if meridian {
                    return Some(generator_at(angle_about(
                        &sphere.frame,
                        curve.point_at(0.0),
                    )?));
                }
                sampled_sphere_circle(surface, curve)
            }
            _ => None,
        },
        Surface::Nurbs(_) => None,
    }
}

/// A spline edge's image in an analytic surface's parameters, walked over
/// the spline's whole domain and unwound across any seam.
fn sampled_image(surface: &Surface, curve: &Curve3) -> Option<Curve> {
    const SAMPLES: usize = 64;
    let Curve3::Nurbs(spline) = curve else {
        return None;
    };
    let (start, end) = spline.domain();
    let periods = periods(surface);
    let mut points: Vec<[f64; 2]> = Vec::with_capacity(SAMPLES + 1);
    for index in 0..=SAMPLES {
        let t = start + (end - start) * index as f64 / SAMPLES as f64;
        let (u, v) = surface.parameters_at(curve.point_at(t))?;
        let mut here = [u, v];
        if let Some(previous) = points.last() {
            for axis in 0..2 {
                if let Some(period) = periods[axis] {
                    here[axis] = unwound(here[axis], previous[axis], period);
                }
            }
        }
        points.push(here);
    }
    Some(Curve::Polyline(Polyline {
        vertices: points.into_iter().map(PolylineVertex::straight).collect(),
        closed: false,
    }))
}

/// A general circle on a sphere is not a conic in longitude/latitude space.
/// Store its pcurve as a dense closed parameter-space chain through exact
/// samples while retaining the analytic circle as the space edge.
fn sampled_sphere_circle(surface: &Surface, curve: &Curve3) -> Option<Curve> {
    const SAMPLES: usize = 96;
    let mut points = Vec::with_capacity(SAMPLES);
    let mut previous = None;
    for index in 0..SAMPLES {
        let parameter = TAU * index as f64 / SAMPLES as f64;
        let (mut u, v) = surface.parameters_at(curve.point_at(parameter))?;
        if let Some(last) = previous {
            u = unwound(u, last, TAU);
        }
        previous = Some(u);
        points.push([u, v]);
    }
    let (mut final_u, final_v) = surface.parameters_at(curve.point_at(TAU))?;
    final_u = unwound(final_u, previous?, TAU);
    let first = points[0];
    if (final_v - first[1]).abs() > 1.0e-6 {
        return None;
    }
    // A circle round the pole axis comes back a turn along, like a band of
    // latitude: one turn, left open, which its periodic images continue.
    let closed = match (final_u - first[0]).abs() {
        gap if gap <= 1.0e-6 => true,
        gap if (gap - TAU).abs() <= 1.0e-6 => false,
        _ => return None,
    };
    if !closed {
        points.push([final_u, final_v]);
    }
    Some(Curve::Polyline(Polyline {
        vertices: points
            .into_iter()
            .map(PolylineVertex::straight)
            .collect(),
        closed,
    }))
}

/// A face's loops as curves in its surface's parameter space, each trimmed
/// to the edge it came from and oriented the way its loop runs.
///
/// The trimming is the part that matters for containment. A straight edge
/// projects to an infinite line, and a boundary made of infinite lines
/// encloses nothing and reports every point as lying on it. A *circular*
/// edge is the same problem wearing a bounded shape: half an arc on a plane
/// projects to the whole circle it lies on, and a face bounded by whole
/// circles where it meant arcs covers a region nobody asked for.
///
/// The orientation matters for anything walking the ring. An edge has one
/// direction and its two coedges disagree about it, so a boundary built from
/// the edges runs backwards wherever the loop does — half the time on any
/// closed solid. A caller chaining the pieces then gets a ring in no order at
/// all.
///
/// `None` when any edge's projection has no closed form: a boundary with a
/// piece missing is worse than none, since a caller would take the rest for
/// the whole.
pub fn face_boundary(
    body: &super::topology::Body,
    face: super::topology::FaceKey,
    tolerance: f64,
) -> Option<Vec<Curve>> {
    Some(
        face_boundary_parts(body, face, tolerance)?
            .into_iter()
            .map(|(_, curve)| curve)
            .collect(),
    )
}

pub(crate) fn face_boundary_parts(
    body: &super::topology::Body,
    face: super::topology::FaceKey,
    tolerance: f64,
) -> Option<Vec<(super::topology::CoedgeKey, Curve)>> {
    let node = body.faces.get(face)?;
    let surface = body.surfaces.get(node.surface)?;
    let mut out = Vec::new();
    for ring in &node.loops {
        let mut pieces = Vec::new();
        for coedge in &body.loops.get(*ring)?.coedges {
            let coedge_node = body.coedges.get(*coedge)?;
            if let Some(curve) = &coedge_node.pcurve {
                pieces.push((*coedge, curve.clone()));
                continue;
            }
            let edge_key = coedge_node.edge;
            let edge = body.edges.get(edge_key)?;
            let curve = body.curves.get(edge.curve)?;
            // A curve with no written image — anything on a spline patch, a
            // slanted section of a cylinder — still bounds the face: the walk
            // `trim_to` takes over the edge's own span is its image.
            let whole = (edge.start_parameter, edge.end_parameter);
            let flat = match project(surface, curve, tolerance) {
                Some(flat) => flat,
                None if span_on(surface, curve, whole, tolerance) => Curve::Polyline(Polyline {
                    vertices: Vec::new(),
                    closed: false,
                }),
                None => return None,
            };
            // The loop's own direction, not the edge's.
            let forward = coedge_node.forward;
            let span = if forward {
                (edge.start_parameter, edge.end_parameter)
            } else {
                (edge.end_parameter, edge.start_parameter)
            };
            pieces.push((*coedge, trim_to(surface, curve, span, flat)?));
        }
        let mut curves: Vec<Curve> = pieces.iter().map(|(_, curve)| curve.clone()).collect();
        chain_round(&mut curves, periods(surface));
        for ((_, curve), moved) in pieces.iter_mut().zip(curves) {
            *curve = moved;
        }
        out.extend(pieces);
    }
    Some(out)
}

/// Slides each piece of a loop by whole turns so the ring joins up.
///
/// On a surface closed in `u`, a point does not have one parameter — it has
/// one every turn. A seam is the case that matters: the face runs the whole
/// way round and meets itself there, so its two coedges are the *same* edge
/// and project to the same `u`, when what bounds the face is that edge at
/// zero and again at a full turn. Read literally, the ring collapses to a
/// line and the face cannot be filled at all — which is why a cylinder's
/// wall silently produced no triangles before this.
///
/// ACIS keeps a pcurve on every coedge and so has the answer stored. Until
/// this kernel does too, the ring itself says which turn each piece belongs
/// on: the one that continues from where the last piece ended.
fn chain_round(pieces: &mut [Curve], periods: [Option<f64>; 2]) {
    if periods == [None, None] || pieces.len() < 2 {
        return;
    }
    let mut head = pieces[0].point_at(1.0);
    let mut behind = [pieces[0].point_at(0.0), head, pieces[0].point_at(0.5)];
    for piece in pieces.iter_mut().skip(1) {
        let (start, end, middle) = (piece.point_at(0.0), piece.point_at(1.0), piece.point_at(0.5));
        let mut best = (f64::INFINITY, [0.0, 0.0]);
        for across in turns(periods[0]) {
            for along in turns(periods[1]) {
                let shift = [across, along];
                // A seam is one edge used twice by the same loop, and its two
                // uses are a whole turn apart — that is what makes the face a
                // rectangle in `(u, v)` rather than a slit. Placing the second
                // on top of the first is the nearest fit and always the wrong
                // one: it retraces the piece before it and the ring encloses
                // nothing, which is how a cone's wall came to be missing from
                // every mesh.
                //
                // Only the same path counts: two arcs between one pair of
                // corners — a sliver cut from a sphere — share their ends too.
                let moved = [
                    [start[0] + shift[0], start[1] + shift[1]],
                    [end[0] + shift[0], end[1] + shift[1]],
                    [middle[0] + shift[0], middle[1] + shift[1]],
                ];
                if near(moved[0], behind[1]) && near(moved[1], behind[0]) && near(moved[2], behind[2]) {
                    continue;
                }
                let gap = (moved[0][0] - head[0]).hypot(moved[0][1] - head[1]);
                if gap < best.0 {
                    best = (gap, shift);
                }
            }
        }
        if best.1 != [0.0, 0.0] {
            slide(piece, best.1);
        }
        behind = [piece.point_at(0.0), piece.point_at(1.0), piece.point_at(0.5)];
        head = behind[1];
    }
}

/// Whether two parameter-space points are the same place, at the scale
/// whole turns are compared on.
fn near(a: [f64; 2], b: [f64; 2]) -> bool {
    (a[0] - b[0]).hypot(a[1] - b[1]) < 1e-9
}

/// The whole turns worth trying on one axis: none at all when it does not
/// wrap, and a turn either way when it does.
fn turns(period: Option<f64>) -> impl Iterator<Item = f64> {
    let period = period.filter(|period| period.is_finite() && *period > 0.0);
    let span = if period.is_some() { 2 } else { 0 };
    (-span..=span).map(move |turn| period.unwrap_or(0.0) * f64::from(turn))
}

/// Moves a projected piece by whole turns. Only the straight and sampled
/// kinds ever need it: a circle or an ellipse in parameter space comes from a
/// plane, and a plane does not wrap.
fn slide(piece: &mut Curve, shift: [f64; 2]) {
    match piece {
        Curve::Line(line) => {
            for axis in 0..2 {
                line.start[axis] += shift[axis];
                line.end[axis] += shift[axis];
            }
        }
        Curve::Polyline(polyline) => {
            for vertex in &mut polyline.vertices {
                for axis in 0..2 {
                    vertex.position[axis] += shift[axis];
                }
            }
        }
        _ => {}
    }
}

/// How many places along an edge are looked at to find where its projection
/// begins and ends. Three would do for the shapes here; more costs nothing
/// and keeps the unwrapping below honest when an edge covers most of a turn.
const WALK: usize = 8;
/// Steps per whole turn when a sampled projection is walked.
const SAMPLED_WALK: usize = 256;

/// The part of a projected boundary curve the edge actually covers.
///
/// Worked out by walking the space curve over the edge's own parameter range
/// and projecting as it goes, rather than from the two endpoints alone. The
/// endpoints do not say enough: an arc covering three quarters of a turn has
/// the same pair of ends as the quarter left over, and on a closed surface
/// they do not even say which way round the edge went.
fn trim_to(
    surface: &Surface,
    curve: &Curve3,
    span: (f64, f64),
    flat: Curve,
) -> Option<Curve> {
    // A parameter that wraps reads a walk across the seam as a jump
    // backwards unless it is unwound. One that does not wrap must be left
    // alone: unwinding a plane's coordinates would move the curve.
    let periods = periods(surface);
    // A sampled projection is kept as the walk itself, so it walks finely:
    // evenly round the turn, so a short arc is not sampled like a whole one.
    let steps = if matches!(flat, Curve::Polyline(_)) {
        ((span.1 - span.0).abs() / TAU * SAMPLED_WALK as f64).ceil().clamp(16.0, SAMPLED_WALK as f64) as usize
    } else {
        WALK
    };
    let mut raw: Vec<[f64; 2]> = Vec::with_capacity(steps + 1);
    for step in 0..=steps {
        let t = span.0 + (span.1 - span.0) * step as f64 / steps as f64;
        let point = curve.point_at(t);
        if let Some((u, v)) = surface.parameters_at(point) {
            raw.push([u, v]);
            continue;
        }
        let Surface::Sphere(sphere) = surface else {
            return None;
        };
        let local = sphere.frame.project(point)?;
        let axis = Vec3::from(sphere.frame.normal()?);
        let height = (Vec3::from(point) - Vec3::from(sphere.frame.origin)).dot(axis);
        if local[0].hypot(local[1]) > f64::EPSILON * sphere.radius.max(1.0) {
            return None;
        }
        // Longitude is singular at a pole. Keep it unset until a neighbouring
        // non-pole sample supplies the meridian this edge approaches on.
        raw.push([f64::NAN, height.atan2(0.0)]);
    }
    for index in 0..raw.len() {
        if raw[index][0].is_finite() {
            continue;
        }
        let longitude = (1..raw.len()).find_map(|distance| {
            index
                .checked_sub(distance)
                .and_then(|near| raw[near][0].is_finite().then_some(raw[near][0]))
                .or_else(|| {
                    raw.get(index + distance)
                        .and_then(|near| near[0].is_finite().then_some(near[0]))
                })
        })?;
        raw[index][0] = longitude;
    }

    let mut walk: Vec<[f64; 2]> = Vec::with_capacity(steps + 1);
    let mut last: Option<[f64; 2]> = None;
    for mut here in raw {
        if let Some(previous) = last {
            for axis in 0..2 {
                if let Some(period) = periods[axis] {
                    here[axis] = unwound(here[axis], previous[axis], period);
                }
            }
        }
        last = Some(here);
        walk.push(here);
    }
    let (first, final_point) = (walk[0], walk[steps]);

    Some(match flat {
        // The kinds that run past their edge become the segment between the
        // two ends. A straight edge's projection is straight, so nothing is
        // lost by saying so — and a band round a cylinder is straight in
        // `(u, v)` too.
        Curve::XLine(_) | Curve::Ray(_) | Curve::Line(_) => Curve::Line(Line {
            start: first,
            end: final_point,
        }),
        Curve::Circle(circle) => {
            let (from, to) = swept(&walk, circle.centre, |point, centre| {
                (point[1] - centre[1]).atan2(point[0] - centre[0])
            });
            let positive = if (to - from).abs() >= TAU - 1e-9 {
                Curve::Circle(circle)
            } else {
                Curve::Arc(Arc { centre: circle.centre, radius: circle.radius,
                    start_angle: from.min(to), end_angle: from.max(to) })
            };
            // Circle and Arc represent positive traversal only. Retain a
            // clockwise coedge as an exact reversed rational conic instead.
            if to < from {
                Curve::Nurbs(super::nurbs_builder::RationalCurve2::from_curve(&positive)?.reversed().curve()?)
            } else { positive }
        }
        Curve::Ellipse(whole) => {
            let (from, to) = swept(&walk, [0.0, 0.0], |point, _| {
                Curve::Ellipse(whole).parameter_at(*point) * TAU
            });
            let positive = if (to - from).abs() >= TAU - 1e-9 {
                Curve::Ellipse(whole)
            } else {
                Curve::Ellipse(EllipseArc { ellipse: whole.ellipse,
                    start_parameter: from.min(to), end_parameter: from.max(to) })
            };
            if to < from {
                Curve::Nurbs(super::nurbs_builder::RationalCurve2::from_curve(&positive)?.reversed().curve()?)
            } else { positive }
        }
        // A sampled circle covers the whole turn; the edge is the walk.
        Curve::Polyline(_) => Curve::Polyline(Polyline {
            vertices: walk.into_iter().map(PolylineVertex::straight).collect(),
            closed: false,
        }),
        // A spline's projection already spans exactly its own edge.
        other => other,
    })
}

/// Where a walk round a closed curve begins and ends, unwound so the two
/// bound the part actually covered, retaining direction even for full turns.
fn swept(
    walk: &[[f64; 2]],
    centre: [f64; 2],
    angle_of: impl Fn(&[f64; 2], [f64; 2]) -> f64,
) -> (f64, f64) {
    let mut angles = Vec::with_capacity(walk.len());
    let mut last: Option<f64> = None;
    for point in walk {
        let mut angle = angle_of(point, centre);
        if let Some(previous) = last {
            angle = unwound(angle, previous, TAU);
        }
        last = Some(angle);
        angles.push(angle);
    }
    let (from, to) = (angles[0], angles[angles.len() - 1]);
    (from, to)
}

/// `angle` moved by whole turns to sit within half a turn of `previous`.
fn unwound(value: f64, previous: f64, period: f64) -> f64 {
    value + period * ((previous - value) / period).round()
}

/// A line of constant `v`, spanning one full turn of `u`.
///
/// Bounded rather than infinite because `u` on a closed surface is periodic:
/// past a turn it repeats, and a curve that ran on forever would report every
/// crossing an unbounded number of times.
fn band_at(height: f64) -> Curve {
    Curve::Line(Line {
        start: [0.0, height],
        end: [TAU, height],
    })
}

/// The same the other way: constant `u`, a full turn of `v`. Only a torus
/// has one, since it is the only surface here that closes both ways.
fn meridian_at(angle: f64) -> Curve {
    Curve::Line(Line {
        start: [angle, 0.0],
        end: [angle, TAU],
    })
}

/// Which of a surface's parameters wrap.
///
/// `u` runs round every closed surface here; `v` only runs round a torus. A
/// plane's do not wrap at all, and unwinding one there would move the curve
/// rather than place it.
pub(crate) fn periods(surface: &Surface) -> [Option<f64>; 2] {
    match surface {
        Surface::Plane(_) => [None, None],
        Surface::Cylinder(_) | Surface::Cone(_) | Surface::Sphere(_) => [Some(TAU), None],
        Surface::Torus(_) => [Some(TAU), Some(TAU)],
        Surface::Nurbs(surface) => {
            let ((u0, u1), (v0, v1)) = surface.domain();
            let periodic = surface.periodicity();
            [
                periodic[0].then_some(u1 - u0),
                periodic[1].then_some(v1 - v0),
            ]
        }
    }
}

pub(crate) fn contains_parameter(
    surface: &Surface,
    boundary: &[Curve],
    point: [f64; 2],
    tolerance: crate::geom2d::Tolerance,
) -> bool {
    let periods = periods(surface);
    // A band's rims are not polygons, and a polygon test over them reads a
    // point in one of the band's holes as inside it; counted along `v` the
    // holes and rims all answer alike.
    if let Some(inside) = band_parity(periods, boundary, point, tolerance) {
        return inside;
    }
    let turns = |period: Option<f64>| match period {
        Some(period) => vec![-period, 0.0, period],
        None => vec![0.0],
    };
    let enclosed = turns(periods[0]).into_iter().any(|u| {
        turns(periods[1]).into_iter().any(|v| {
            crate::geom2d::contains(
                boundary,
                [point[0] + u, point[1] + v],
                tolerance,
            )
        })
    });
    if enclosed {
        return true;
    }
    // Two full-turn loops bound a band without forming a plane polygon.
    periodic_band_levels(surface, boundary, tolerance.linear()).is_some_and(|levels| {
        point[1] >= levels[0] - tolerance.linear()
            && point[1] <= levels[1] + tolerance.linear()
    })
}

/// Whether a point is inside a band — a face whose rims wrap round the
/// surface rather than close, holes and notches and all. A line from the
/// point along `v`, past every rim, crosses the boundary an odd number of
/// times from inside; the boundary covers one turn, so the line is tried at
/// every turn it spans. `None` for a face that is not a band.
fn band_parity(
    periods: [Option<f64>; 2],
    boundary: &[Curve],
    point: [f64; 2],
    tolerance: crate::geom2d::Tolerance,
) -> Option<bool> {
    let ([Some(period), None], false) = (periods, boundary.is_empty()) else {
        return None;
    };
    // A band has its rims wrap round, each a turn along, in pairs; with no
    // wrapping loop the face is the polygon test's. One wrapping loop alone
    // — a cone's rim, its face running up to the apex — bounds a side only
    // the apex decides, not a band.
    let near =
        |a: [f64; 2], b: [f64; 2]| (a[0] - b[0]).hypot(a[1] - b[1]) <= tolerance.linear();
    // The boundary lists each loop's pieces in order; a loop ends where the
    // next piece does not take up from it. Pieces walked from a spline meet
    // only to the walk's accuracy, and a wrap leaves a whole turn between
    // the loop's two ends.
    let joined =
        |a: [f64; 2], b: [f64; 2]| (a[0] - b[0]).hypot(a[1] - b[1]) <= period * 1e-3;
    let mut wrapping = 0;
    let mut loop_start = 0;
    for (index, curve) in boundary.iter().enumerate() {
        let end = curve.point_at(1.0);
        let continues = boundary
            .get(index + 1)
            .is_some_and(|next| joined(next.point_at(0.0), end));
        if !continues {
            if !joined(boundary[loop_start].point_at(0.0), end) {
                wrapping += 1;
            }
            loop_start = index + 1;
        }
    }
    if wrapping < 2 || wrapping % 2 == 1 {
        return None;
    }
    let samples: Vec<[f64; 2]> = boundary
        .iter()
        .flat_map(|curve| (0..=16).map(move |step| curve.point_at(step as f64 / 16.0)))
        .collect();
    let (low, high, top) = samples.iter().fold(
        (f64::INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY),
        |(low, high, top), sample| {
            (low.min(sample[0]), high.max(sample[0]), top.max(sample[1]))
        },
    );
    if point[1] >= top {
        return Some(false);
    }
    let top = top + (top - point[1]) + 1.0;
    let first = ((low - point[0]) / period).floor() as i64 - 1;
    let last = ((high - point[0]) / period).ceil() as i64 + 1;
    // Each piece's box, so the line is only tried against pieces it can meet.
    let boxes: Vec<[[f64; 2]; 2]> = boundary
        .iter()
        .map(|curve| {
            let points: Vec<[f64; 2]> = match curve {
                Curve::Polyline(polyline)
                    if polyline.vertices.iter().all(|vertex| vertex.bulge == 0.0) =>
                {
                    polyline.vertices.iter().map(|vertex| vertex.position).collect()
                }
                _ => (0..=16).map(|step| curve.point_at(step as f64 / 16.0)).collect(),
            };
            let mut low = [f64::INFINITY; 2];
            let mut high = [f64::NEG_INFINITY; 2];
            for point in &points {
                for axis in 0..2 {
                    low[axis] = low[axis].min(point[axis]);
                    high[axis] = high[axis].max(point[axis]);
                }
            }
            let pad = (high[0] - low[0]).hypot(high[1] - low[1]) * 0.05 + period * 1e-3;
            [[low[0] - pad, low[1] - pad], [high[0] + pad, high[1] + pad]]
        })
        .collect();
    let mut crossings: Vec<[f64; 2]> = Vec::new();
    for turn in first..=last {
        let u = point[0] + turn as f64 * period;
        // Slanted a little, so the line never runs along an edge of
        // constant `u` — a generator, a slot's side.
        let ray = Curve::Line(Line {
            start: [u, point[1]],
            end: [u + period * 1e-3, top],
        });
        for (curve, bounds) in boundary.iter().zip(&boxes) {
            if u < bounds[0][0] || u > bounds[1][0] || point[1] > bounds[1][1] {
                continue;
            }
            for crossing in crate::geom2d::intersect(&ray, curve, tolerance) {
                // Where two boundary pieces meet, both report the joint —
                // a turn apart, where a wrapping loop comes round.
                let turned = [crossing.point[0].rem_euclid(period), crossing.point[1]];
                if !crossings.iter().any(|seen| {
                    near(*seen, turned)
                        || near([seen[0] + period, seen[1]], turned)
                        || near([seen[0] - period, seen[1]], turned)
                }) {
                    crossings.push(turned);
                }
            }
        }
    }
    Some(crossings.len() % 2 == 1)
}

/// An interior point between two full-turn boundary loops.
pub(crate) fn periodic_band_point(
    surface: &Surface,
    boundary: &[Curve],
    tolerance: f64,
) -> Option<[f64; 3]> {
    let levels = periodic_band_levels(surface, boundary, tolerance)?;
    let u = boundary.first()?.point_at(0.5)[0];
    Some(surface.point_at(u, 0.5 * (levels[0] + levels[1])))
}

fn periodic_band_levels(
    surface: &Surface,
    boundary: &[Curve],
    tolerance: f64,
) -> Option<[f64; 2]> {
    let period = periods(surface)[0]?;
    let mut levels: Vec<(f64, f64)> = Vec::new();
    for curve in boundary {
        let Curve::Line(line) = curve else {
            return None;
        };
        if (line.end[1] - line.start[1]).abs() > tolerance {
            return None;
        }
        let level = 0.5 * (line.start[1] + line.end[1]);
        let span = (line.end[0] - line.start[0]).abs();
        if let Some((_, covered)) = levels
            .iter_mut()
            .find(|(existing, _)| (*existing - level).abs() <= tolerance)
        {
            *covered += span;
        } else {
            levels.push((level, span));
        }
    }
    if levels.len() != 2
        || levels
            .iter()
            .any(|(_, covered)| *covered < period - tolerance)
    {
        return None;
    }
    levels.sort_by(|a, b| a.0.total_cmp(&b.0));
    Some([levels[0].0, levels[1].0])
}

/// A line of constant `u`, unbounded in `v` — a generator, which the face's
/// own extent trims.
fn generator_at(angle: f64) -> Curve {
    Curve::XLine(XLine {
        base: [angle, 0.0],
        direction: [0.0, 1.0],
    })
}

/// Where `point` sits around a frame's axis, in radians from its x axis.
fn angle_about(frame: &crate::space::Plane, point: [f64; 3]) -> Option<f64> {
    let local = frame.project(point)?;
    Some(local[1].atan2(local[0]))
}

/// Whether every sampled point of the curve is on the surface.
fn lies_on(surface: &Surface, curve: &Curve3, tolerance: f64) -> bool {
    // Spread over a range wide enough to catch a curve that touches the
    // surface but does not follow it — a line crossing a sphere is on it at
    // two parameters and nowhere else.
    const SAMPLES: usize = 9;
    let points: Vec<[f64; 3]> = (0..SAMPLES)
        .map(|index| {
            let t = match curve {
                Curve3::Line(_) => -2.0 + 4.0 * index as f64 / (SAMPLES - 1) as f64,
                Curve3::PlanarSpline { .. } => index as f64 / (SAMPLES - 1) as f64,
                Curve3::Nurbs(spline) => {
                    let (start, end) = spline.domain();
                    start + (end - start) * index as f64 / (SAMPLES - 1) as f64
                }
                _ => TAU * index as f64 / SAMPLES as f64,
            };
            curve.point_at(t)
        })
        .collect();
    let allowance = fit_allowance(surface, curve, &points, tolerance);
    points.into_iter().all(|point| surface.distance_to(point).abs() <= allowance)
}

/// How far a curve may stand off a surface and still be on it. A spline in a
/// file is a fit to the true intersection or surface, within the fit's own
/// tolerance — up to a thousandth of the curve, many times the
/// modelling tolerance — so a spline on either side is held to that.
fn fit_allowance(
    surface: &Surface,
    curve: &Curve3,
    points: &[[f64; 3]],
    tolerance: f64,
) -> f64 {
    if !matches!(curve, Curve3::Nurbs(_)) && !matches!(surface, Surface::Nurbs(_)) {
        return tolerance;
    }
    let first = Vec3::from(points[0]);
    let extent = points
        .iter()
        .map(|point| Vec3::from(*point).distance(first))
        .fold(0.0, f64::max);
    tolerance.max(extent * 1e-3)
}

/// Whether an edge's own span lies on a surface. A spline patch ends where
/// the face does, so the curve beyond the edge's ends is no evidence.
fn span_on(surface: &Surface, curve: &Curve3, span: (f64, f64), tolerance: f64) -> bool {
    const SAMPLES: usize = 9;
    let points: Vec<[f64; 3]> = (0..SAMPLES)
        .map(|index| {
            curve.point_at(span.0 + (span.1 - span.0) * index as f64 / (SAMPLES - 1) as f64)
        })
        .collect();
    let allowance = fit_allowance(surface, curve, &points, tolerance);
    points.into_iter().all(|point| surface.distance_to(point).abs() <= allowance)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::brep::geometry::{Circle3, Cone, Cylinder, Ellipse3, Line3, Sphere};
    use crate::geom2d::{NurbsCurve, Vec2};
    use crate::space::Plane;
    use std::f64::consts::{FRAC_PI_2, FRAC_PI_4};

    const TOL: f64 = 1e-9;

    fn plane_at(origin: [f64; 3], normal: [f64; 3]) -> Plane {
        let seed = if normal[0].abs() < 0.9 {
            [1.0, 0.0, 0.0]
        } else {
            [0.0, 1.0, 0.0]
        };
        Plane::orthonormal(origin, seed, normal).unwrap()
    }

    /// Every point of the projected curve, lifted back through the surface,
    /// must land on the space curve. That round trip is the whole contract.
    fn assert_round_trips(surface: &Surface, curve: &Curve3, flat: &Curve, span: (f64, f64)) {
        for index in 0..=10 {
            let t = span.0 + (span.1 - span.0) * index as f64 / 10.0;
            let uv = flat.point_at(t);
            let lifted = surface.point_at(uv[0], uv[1]);
            // The lifted point has to be *on* the space curve, which is
            // asked by inverting the curve and evaluating it back.
            let back = curve.point_at(curve.parameter_at(lifted));
            assert!(
                Vec3::from(lifted).distance(Vec3::from(back)) < 1e-6,
                "t={t}: {lifted:?} is not on the curve ({back:?})"
            );
        }
    }

    #[test]
    fn a_line_on_a_plane_projects_to_a_line() {
        let plane = plane_at([0.0, 0.0, 5.0], [0.0, 0.0, 1.0]);
        let surface = Surface::Plane(plane);
        let curve = Curve3::Line(Line3 {
            origin: [1.0, 2.0, 5.0],
            direction: [3.0, 4.0, 0.0],
        });
        let flat = project(&surface, &curve, TOL).expect("a line on its own plane");
        assert_round_trips(&surface, &curve, &flat, (-2.0, 2.0));
        // And the parameter happens to carry across for a straight curve,
        // since both are `base + t · direction`.
        assert_eq!(flat.point_at(1.0), [4.0, 6.0]);
    }

    #[test]
    fn a_circle_on_a_plane_projects_to_a_circle() {
        let plane = plane_at([0.0; 3], [0.0, 0.0, 1.0]);
        let surface = Surface::Plane(plane);
        let curve = Curve3::Circle(Circle3 {
            plane: plane_at([2.0, 3.0, 0.0], [0.0, 0.0, 1.0]),
            radius: 4.0,
        });
        let flat = project(&surface, &curve, TOL).expect("a circle on its own plane");
        let Curve::Circle(circle) = &flat else {
            panic!("expected a circle, got {flat:?}");
        };
        assert!((circle.radius - 4.0).abs() < 1e-12);
        assert_round_trips(&surface, &curve, &flat, (0.0, 1.0));
    }

    #[test]
    fn an_ellipse_on_a_plane_keeps_both_its_radii_and_its_direction() {
        let plane = plane_at([0.0; 3], [0.0, 0.0, 1.0]);
        let surface = Surface::Plane(plane);
        // Major axis along +Y, so a projection that assumed +X would be a
        // quarter turn out.
        let frame = Plane::from_axes([1.0, 1.0, 0.0], [0.0, 1.0, 0.0], [-1.0, 0.0, 0.0]);
        let curve = Curve3::Ellipse(Ellipse3 {
            plane: frame,
            major_radius: 6.0,
            minor_radius: 2.0,
        });
        let flat = project(&surface, &curve, TOL).expect("an ellipse on its own plane");
        let Curve::Ellipse(arc) = &flat else {
            panic!("expected an ellipse, got {flat:?}");
        };
        assert!((arc.ellipse.major_radius - 6.0).abs() < 1e-12);
        assert!((arc.ellipse.major_axis[1] - 1.0).abs() < 1e-12, "{:?}", arc.ellipse.major_axis);
        assert_round_trips(&surface, &curve, &flat, (0.0, 1.0));
    }

    #[test]
    fn a_curve_off_the_surface_has_no_projection() {
        // The failure this guards: projecting it anyway gives a shape of the
        // right kind sitting in the wrong place, which validates and is
        // wrong.
        let surface = Surface::Plane(plane_at([0.0; 3], [0.0, 0.0, 1.0]));
        let above = Curve3::Line(Line3 {
            origin: [0.0, 0.0, 4.0],
            direction: [1.0, 0.0, 0.0],
        });
        assert!(project(&surface, &above, TOL).is_none());
        // One that merely crosses the plane is not on it either.
        let through = Curve3::Line(Line3 {
            origin: [0.0, 0.0, -1.0],
            direction: [0.0, 0.0, 1.0],
        });
        assert!(project(&surface, &through, TOL).is_none());
    }

    #[test]
    fn a_circle_round_a_cylinder_becomes_a_straight_band() {
        // The point of parameter space: a circle is a straight line there.
        let cylinder = Cylinder {
            base: plane_at([0.0; 3], [0.0, 0.0, 1.0]),
            radius: 3.0,
        };
        let surface = Surface::Cylinder(cylinder);
        let curve = Curve3::Circle(Circle3 {
            plane: plane_at([0.0, 0.0, 7.0], [0.0, 0.0, 1.0]),
            radius: 3.0,
        });
        let flat = project(&surface, &curve, TOL).expect("a circle round its own cylinder");
        let Curve::Line(line) = &flat else {
            panic!("expected a line in (u, v), got {flat:?}");
        };
        assert!((line.start[1] - 7.0).abs() < 1e-12, "the height is v");
        assert!((line.end[0] - TAU).abs() < 1e-12, "one full turn of u");
        assert_round_trips(&surface, &curve, &flat, (0.0, 1.0));
    }

    #[test]
    fn a_generator_on_a_cylinder_becomes_a_line_of_constant_angle() {
        let cylinder = Cylinder {
            base: plane_at([0.0; 3], [0.0, 0.0, 1.0]),
            radius: 3.0,
        };
        let surface = Surface::Cylinder(cylinder);
        // The generator at ninety degrees round.
        let curve = Curve3::Line(Line3 {
            origin: [0.0, 3.0, 0.0],
            direction: [0.0, 0.0, 1.0],
        });
        let flat = project(&surface, &curve, TOL).expect("a generator on its own cylinder");
        let Curve::XLine(line) = &flat else {
            panic!("expected an infinite line, got {flat:?}");
        };
        assert!((line.base[0] - FRAC_PI_2).abs() < 1e-9, "{:?}", line.base);
        assert_round_trips(&surface, &curve, &flat, (-3.0, 3.0));
    }

    #[test]
    fn a_slanted_section_of_a_cylinder_has_no_written_form() {
        // It is a sine wave in (u, v). Calling it a spline would be an
        // approximation presented as a fact.
        let surface = Surface::Cylinder(Cylinder {
            base: plane_at([0.0; 3], [0.0, 0.0, 1.0]),
            radius: 3.0,
        });
        let slanted = Curve3::Ellipse(Ellipse3 {
            plane: plane_at([0.0; 3], [0.0, 1.0, 1.0]),
            major_radius: 3.0 * std::f64::consts::SQRT_2,
            minor_radius: 3.0,
        });
        assert!(project(&surface, &slanted, TOL).is_none());
    }

    #[test]
    fn a_circle_round_a_cone_becomes_a_band_at_its_height() {
        let cone = Cone {
            base: plane_at([0.0; 3], [0.0, 0.0, 1.0]),
            radius: 10.0,
            half_angle: FRAC_PI_4,
        };
        let surface = Surface::Cone(cone);
        let curve = Curve3::Circle(Circle3 {
            plane: plane_at([0.0, 0.0, 4.0], [0.0, 0.0, 1.0]),
            radius: 6.0,
        });
        let flat = project(&surface, &curve, TOL).expect("a circle round its own cone");
        let Curve::Line(line) = &flat else {
            panic!("expected a line, got {flat:?}");
        };
        assert!((line.start[1] - 4.0).abs() < 1e-12);
        assert_round_trips(&surface, &curve, &flat, (0.0, 1.0));
    }

    #[test]
    fn a_generator_on_a_cone_leans_and_is_still_one_angle() {
        // Unlike a cylinder's, a cone's generator is not parallel to the
        // axis, so a parallel test would reject it. What identifies it is
        // holding one angle the whole way.
        let cone = Cone {
            base: plane_at([0.0; 3], [0.0, 0.0, 1.0]),
            radius: 10.0,
            half_angle: FRAC_PI_4,
        };
        let surface = Surface::Cone(cone);
        let curve = Curve3::Line(Line3 {
            origin: [10.0, 0.0, 0.0],
            direction: [-1.0, 0.0, 1.0],
        });
        let flat = project(&surface, &curve, 1e-6).expect("a generator on its own cone");
        let Curve::XLine(line) = &flat else {
            panic!("expected an infinite line, got {flat:?}");
        };
        assert!(line.base[0].abs() < 1e-9, "at angle zero: {:?}", line.base);
    }

    #[test]
    fn a_spline_on_its_own_plane_carries_over_whole() {
        let frame = plane_at([0.0; 3], [0.0, 0.0, 1.0]);
        let surface = Surface::Plane(frame);
        let curve = Curve3::PlanarSpline {
            plane: frame,
            curve: NurbsCurve::new(
                3,
                vec![[0.0, 0.0], [1.0, 5.0], [4.0, 5.0], [5.0, 0.0]],
                Vec::new(),
                None,
            )
            .unwrap(),
        };
        let flat = project(&surface, &curve, TOL).expect("a spline on its own plane");
        assert!(matches!(flat, Curve::Nurbs(_)));
        assert_round_trips(&surface, &curve, &flat, (0.0, 1.0));
    }

    #[test]
    fn a_spheres_equator_becomes_a_straight_band() {
        let surface = Surface::Sphere(Sphere {
            frame: plane_at([0.0; 3], [0.0, 0.0, 1.0]),
            radius: 5.0,
        });
        let equator = Curve3::Circle(Circle3 {
            plane: plane_at([0.0; 3], [0.0, 0.0, 1.0]),
            radius: 5.0,
        });
        let flat = project(&surface, &equator, TOL).expect("the equator on its own sphere");
        let Curve::Line(line) = &flat else {
            panic!("expected a line in (u, v), got {flat:?}");
        };
        assert!(line.start[1].abs() < 1e-12, "the latitude is zero");
        assert!((line.end[0] - TAU).abs() < 1e-12, "one full longitude turn");
        assert_round_trips(&surface, &equator, &flat, (0.0, 1.0));
    }

    #[test]
    fn a_face_of_a_box_projects_its_own_boundary() {
        // The case the boolean will actually meet first: a planar face and
        // the straight edges that bound it.
        let body = crate::brep::make::cuboid([0.0; 3], [2.0, 3.0, 4.0]).unwrap();
        let mut projected = 0;
        for face in body.face_keys() {
            let surface = body
                .surfaces
                .get(body.faces.get(face).unwrap().surface)
                .unwrap();
            for coedge in body.face_coedges(face) {
                let edge = body.edges.get(body.coedges.get(coedge).unwrap().edge).unwrap();
                let curve = body.curves.get(edge.curve).unwrap();
                let flat = project(surface, curve, 1e-9)
                    .expect("a box's edge lies on the faces it bounds");
                assert_round_trips(surface, curve, &flat, (0.0, 1.0));
                projected += 1;
            }
        }
        assert_eq!(projected, 24, "four edges on each of six faces");
    }

    #[test]
    fn survey_coordinates_project_to_the_same_place() {
        let origin = [512_345.678, 4_512_345.678, 91.5];
        let plane = plane_at(origin, [0.0, 0.0, 1.0]);
        let surface = Surface::Plane(plane);
        let curve = Curve3::Circle(Circle3 {
            plane: plane_at([origin[0] + 1.0, origin[1] + 2.0, origin[2]], [0.0, 0.0, 1.0]),
            radius: 4.0,
        });
        let flat = project(&surface, &curve, 1e-6).expect("still on its plane");
        let Curve::Circle(circle) = &flat else {
            unreachable!()
        };
        assert!((circle.centre[0] - 1.0).abs() < 1e-6, "{:?}", circle.centre);
        assert!((circle.radius - 4.0).abs() < 1e-9);
    }

    #[test]
    fn clockwise_circle_spans_keep_their_direction() {
        let plane = plane_at([0.0; 3], [0.0, 0.0, 1.0]);
        let surface = Surface::Plane(plane);
        let curve = Curve3::Circle(Circle3 {
            plane,
            radius: 2.0,
        });
        let flat = Curve::Circle(crate::geom2d::Circle {
            centre: [0.0, 0.0],
            radius: 2.0,
        });

        let half = trim_to(&surface, &curve, (std::f64::consts::PI, 0.0), flat.clone())
            .expect("a clockwise half circle has an exact projection");
        assert!(matches!(half, Curve::Nurbs(_)));
        assert!(Vec2::from(half.point_at(0.0)).distance(Vec2::from([-2.0, 0.0])) < TOL);
        assert!(Vec2::from(half.point_at(0.5)).distance(Vec2::from([0.0, 2.0])) < TOL);
        assert!(Vec2::from(half.point_at(1.0)).distance(Vec2::from([2.0, 0.0])) < TOL);

        let whole = trim_to(&surface, &curve, (0.0, -TAU), flat)
            .expect("a clockwise full circle has an exact projection");
        assert!(matches!(whole, Curve::Nurbs(_)));
        assert!(Vec2::from(whole.point_at(0.25)).distance(Vec2::from([0.0, -2.0])) < TOL);
    }
}
