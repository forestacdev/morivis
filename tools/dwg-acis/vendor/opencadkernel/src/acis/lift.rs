//! Reading an ACIS document into kernel topology.
//!
//! Unsupported records remain attached through provenance and appear in
//! [`Loss`].

use opencadcodec::entities::acis::types::{
    SatBSplineSurface, SatBody, SatCoedge, SatConeSurface, SatDocument, SatEdge, SatEllipseCurve, SatFace, SatIntCurve,
    SatLoop, SatLump, SatPCurve, SatPlaneSurface, SatPoint, SatPointer, SatRecord, SatShell,
    SatSphereSurface, SatSplineSurface, SatStraightCurve, SatTorusSurface, SatVertex, Sense,
};
use crate::brep::{
    Body, Circle3, Coedge, Cone, Curve3, CurveKey, Cylinder, Edge, EdgeKey, Face, Line3, Loop,
    Lump, Provenance, Shell, SourceRef, Sphere, Surface, SurfaceKey, Torus, Vertex, VertexKey,
};
use crate::geom2d::{Curve as Curve2, NurbsCurve};
use crate::space::{NurbsCurve3, NurbsSurface3, Plane, Vec3};
use std::collections::HashMap;
use std::f64::consts::TAU;

/// What a lift could not represent.
///
/// Empty means the whole document is in the kernel's own terms and can be
/// edited freely. Anything listed is a node whose record is carried through
/// verbatim; an edit that touches one loses whatever the kernel does not
/// model about it.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Loss {
    /// Records whose surface kind has no kernel equivalent, by index.
    pub surfaces: Vec<usize>,
    /// Records whose curve kind has no kernel equivalent, by index.
    pub curves: Vec<usize>,
    /// Records the pointer graph named but that are missing or malformed.
    pub broken: Vec<usize>,
}

impl Loss {
    /// Whether the document lifted completely.
    pub fn is_empty(&self) -> bool {
        self.surfaces.is_empty() && self.curves.is_empty() && self.broken.is_empty()
    }
}

/// Every body in the document, in the order they appear.
pub fn lift(document: &SatDocument) -> (Vec<Body>, Loss) {
    let mut loss = Loss::default();
    // The record index each body came from, so its own provenance is set:
    // `bodies()` hands back views without saying which record each was.
    let indices: Vec<Option<u32>> = document
        .records_of_type("body")
        .iter()
        .map(|record| index_of(record))
        .collect();
    let bodies = document
        .bodies()
        .into_iter()
        .enumerate()
        .filter_map(|(order, body)| {
            lift_one(document, &body, indices.get(order).copied().flatten(), &mut loss)
        })
        .collect();
    (bodies, loss)
}

/// One body, named by the record index of its `body` record.
pub fn lift_body(document: &SatDocument, record: usize) -> Option<(Body, Loss)> {
    let source = document.record(record)?;
    let body = SatBody::from_record(source)?;
    let mut loss = Loss::default();
    let lifted = lift_one(document, &body, index_of(source), &mut loss)?;
    Some((lifted, loss))
}

/// Everything already built, so a record shared by several nodes becomes one
/// node rather than several copies.
#[derive(Default)]
struct Seen {
    vertices: HashMap<u32, VertexKey>,
    edges: HashMap<u32, EdgeKey>,
    curves: HashMap<u32, CurveKey>,
    surfaces: HashMap<u32, SurfaceKey>,
}

fn lift_one(
    document: &SatDocument,
    source: &SatBody<'_>,
    at: Option<u32>,
    loss: &mut Loss,
) -> Option<Body> {
    let mut body = Body::new();
    body.provenance = match at {
        Some(index) => Provenance::Clean(SourceRef::new(index)),
        None => Provenance::Synthesized,
    };
    let mut seen = Seen::default();

    // Lumps, shells, faces and loops are each a linked list rather than an
    // array: the record holds the first, and every one holds the next.
    let mut lump_pointer = source.lump();
    while let Some(record) = resolve(document, lump_pointer) {
        let Some(source_lump) = SatLump::from_record(record) else {
            note_broken(loss, record);
            break;
        };
        let lump = body.lumps.insert(Lump {
            shells: Vec::new(),
            provenance: clean(record),
        });
        body.roots.push(lump);

        let mut shell_pointer = source_lump.shell();
        while let Some(record) = resolve(document, shell_pointer) {
            let Some(source_shell) = SatShell::from_record(record) else {
                note_broken(loss, record);
                break;
            };
            let shell = body.shells.insert(Shell {
                faces: Vec::new(),
                owner: lump,
                provenance: clean(record),
            });
            body.lumps.get_mut(lump)?.shells.push(shell);

            let mut face_pointer = source_shell.face();
            while let Some(record) = resolve(document, face_pointer) {
                let Some(source_face) = SatFace::from_record(record) else {
                    note_broken(loss, record);
                    break;
                };
                lift_face(document, &mut body, &mut seen, loss, &source_face, record, shell);
                face_pointer = source_face.next_face();
            }
            shell_pointer = source_shell.next_shell();
        }
        lump_pointer = source_lump.next_lump();
    }

    if body.roots.is_empty() {
        return None;
    }
    // The topology is stored in body space; the body's `transform` record
    // places it in the world (a moved solid only rewrites that record).
    let Some(record) = resolve(document, source.transform()) else {
        return Some(body);
    };
    let placed = body_placement(record).and_then(|place| crate::brep::transform(&body, &place));
    if placed.is_none() {
        note_broken(loss, record);
    }
    placed
}

/// `world = scale * (p * M) + T`, from the 3x3 row matrix, the translation
/// and the scale at the head of a `transform` record. SAB groups the rows
/// and the translation as positions, and some writers put the whole payload
/// in one long string; all three forms are read.
fn body_placement(record: &SatRecord) -> Option<crate::brep::Placement> {
    if record.entity_type != "transform" {
        return None;
    }
    let mut values = Vec::with_capacity(13);
    for token in &record.tokens {
        if values.len() >= 13 {
            break;
        }
        if let Some((components, len)) = token.coordinate_components() {
            values.extend_from_slice(&components[..len]);
        } else if let Some(value) = token.as_float() {
            values.push(value);
        } else if let Some(value) = token.as_integer() {
            values.push(value as f64);
        } else if let Some(text) = token.as_string() {
            values.extend(text.split_ascii_whitespace().map_while(|word| word.parse::<f64>().ok()));
        }
    }
    if values.len() < 13 || !values[..13].iter().all(|value| value.is_finite()) || values[12] <= 0.0 {
        return None;
    }
    let scale = values[12];
    let row = |at: usize| [scale * values[at], scale * values[at + 1], scale * values[at + 2]];
    Some(crate::brep::Placement {
        x_axis: row(0),
        y_axis: row(3),
        z_axis: row(6),
        origin: [values[9], values[10], values[11]],
    })
}

fn lift_face(
    document: &SatDocument,
    body: &mut Body,
    seen: &mut Seen,
    loss: &mut Loss,
    source: &SatFace<'_>,
    record: &SatRecord,
    shell: crate::brep::ShellKey,
) -> Option<()> {
    let surface_record = resolve(document, source.surface())?;
    let reversed_v = analytic_surface_reversed(surface_record);
    let surface = match surface_of(document, body, seen, loss, source.surface()) {
        Some(surface) => surface,
        // Still counted as lost: the patch only stands in for the surface.
        None => body.surfaces.insert(boundary_patch(document, source)?),
    };
    let face = body.faces.insert(Face {
        surface,
        forward: ((source.sense() == Sense::Forward) != reversed_v)
            != cone_points_inward(surface_record),
        loops: Vec::new(),
        owner: shell,
        provenance: clean(record),
    });
    body.shells.get_mut(shell)?.faces.push(face);

    let mut loop_pointer = source.first_loop();
    while let Some(record) = resolve(document, loop_pointer) {
        let Some(source_loop) = SatLoop::from_record(record) else {
            note_broken(loss, record);
            break;
        };
        let ring = body.loops.insert(Loop {
            coedges: Vec::new(),
            owner: face,
            provenance: clean(record),
        });
        body.faces.get_mut(face)?.loops.push(ring);

        // A loop's coedges are a ring joined by next pointers, so the walk
        // stops when it comes back to where it started rather than at a null.
        let first = source_loop.first_coedge();
        let mut pointer = first;
        let mut coedges = Vec::new();
        loop {
            let Some(record) = resolve(document, pointer) else {
                break;
            };
            let Some(source_coedge) = SatCoedge::from_record(record) else {
                note_broken(loss, record);
                break;
            };
            let elliptic = SatConeSurface::from_record(surface_record)
                .is_some_and(|c| (c.ratio() - 1.0).abs() > 1e-12);
            let pcurve = if elliptic {
                None
            } else {
                read_pcurve(document, source_coedge.pcurve(), reversed_v)
            };
            if let Some(edge) = edge_of(
                document,
                body,
                seen,
                loss,
                &source_coedge,
                surface,
                pcurve.as_ref(),
            ) {
                let edge_forward = resolve(document, source_coedge.edge())
                    .and_then(SatEdge::from_record)
                    .is_some_and(|source_edge| {
                        let Some(edge) = body.edges.get(edge) else {
                            return false;
                        };
                        if edge.start == edge.end {
                            return source_edge.sense() == Sense::Forward;
                        }
                        let source_start =
                            resolve(document, source_edge.start_vertex()).and_then(index_of);
                        let kernel_start = body
                            .vertices
                            .get(edge.start)
                            .and_then(|vertex| vertex.provenance.source())
                            .map(|source| source.index() as u32);
                        source_start.is_some() && source_start == kernel_start
                    });
                let forward = (source_coedge.sense() == Sense::Forward) == edge_forward;
                // A pcurve may run past its edge (a whole ellipse under an
                // arc), so it is cut down to the edge's span. One whose image
                // leaves the edge is worse than none: meshing trusts it over
                // the edge and chases a curve that is not there. Without it
                // the edge's own curve is used.
                let pcurve = pcurve.and_then(|pcurve| pcurve_on_edge(body, surface, edge, &pcurve));
                let coedge = body.coedges.insert(Coedge {
                    edge,
                    forward,
                    pcurve,
                    owner: ring,
                    provenance: clean(record),
                });
                body.edges.get_mut(edge)?.coedges.push(coedge);
                coedges.push(coedge);
            }
            pointer = source_coedge.next();
            if pointer == first || pointer.is_null() {
                break;
            }
            // A malformed ring that never returns would spin here. The loop
            // cannot be longer than the document.
            if coedges.len() > document.record_count() {
                note_broken(loss, record);
                break;
            }
        }
        body.loops.get_mut(ring)?.coedges = coedges;
        loop_pointer = source_loop.next_loop();
    }
    Some(())
}

fn edge_of(
    document: &SatDocument,
    body: &mut Body,
    seen: &mut Seen,
    loss: &mut Loss,
    source_coedge: &SatCoedge<'_>,
    surface: SurfaceKey,
    pcurve: Option<&Curve2>,
) -> Option<EdgeKey> {
    let pointer = source_coedge.edge();
    let record = resolve(document, pointer)?;
    let index = index_of(record)?;
    if let Some(key) = seen.edges.get(&index) {
        return Some(*key);
    }
    let source = SatEdge::from_record(record).or_else(|| {
        note_broken(loss, record);
        None
    })?;
    let fallback = pcurve
        .and_then(|pcurve| surface_curve(body.surfaces.get(surface)?, pcurve))
        .or_else(|| partner_surface_curve(document, source_coedge));
    let curve = curve_of(document, body, seen, loss, source.curve(), fallback)?;
    let source_start = vertex_of(document, body, seen, loss, source.start_vertex())?;
    let source_end = vertex_of(document, body, seen, loss, source.end_vertex())?;
    let edge_forward = source.sense() == Sense::Forward;
    let (start, end) = if edge_forward {
        (source_start, source_end)
    } else {
        (source_end, source_start)
    };
    // Open curves have an unambiguous span, so their vertices resolve stale
    // stored parameters. Closed curves keep the stored choice of arc.
    let ends = (
        body.vertices.get(start)?.point,
        body.vertices.get(end)?.point,
    );
    let apart = Vec3::from(ends.0).distance(Vec3::from(ends.1)) > 1e-9;
    let mut stored_low = source.start_param();
    let mut stored_high = source.end_param();
    if stored_high < stored_low {
        std::mem::swap(&mut stored_low, &mut stored_high);
    }
    let (low, high) = match body.curves.get(curve) {
        Some(shape @ Curve3::Line(_)) if apart => {
            (shape.parameter_at(ends.0), shape.parameter_at(ends.1))
        }
        Some(shape @ Curve3::Nurbs(nurbs))
            if start == end
                && nurbs.periodicity()
                && stored_high - stored_low
                    >= (nurbs.domain().1 - nurbs.domain().0) * (1.0 - 1e-6) =>
        {
            let period = nurbs.domain().1 - nurbs.domain().0;
            let projected = shape.parameter_at(ends.0);
            let stored_gap = Vec3::from(shape.point_at(stored_low)).distance(Vec3::from(ends.0));
            let projected_gap = Vec3::from(shape.point_at(projected)).distance(Vec3::from(ends.0));
            let low = if projected_gap < stored_gap {
                projected
            } else {
                stored_low
            };
            (low, low + period)
        }
        Some(shape @ Curve3::Nurbs(curve)) if apart && !curve.periodicity() => {
            // Numerical projection may stop just short of an exact endpoint.
            // Prefer a stored/domain endpoint only when it fits the vertex better.
            let parameter = |point: [f64; 3]| {
                let domain = curve.domain();
                [
                    shape.parameter_at(point),
                    stored_low,
                    stored_high,
                    domain.0,
                    domain.1,
                ]
                .into_iter()
                .filter(|v| v.is_finite() && *v >= domain.0 && *v <= domain.1)
                .min_by(|a, b| {
                    Vec3::from(shape.point_at(*a))
                        .distance(Vec3::from(point))
                        .total_cmp(&Vec3::from(shape.point_at(*b)).distance(Vec3::from(point)))
                })
                .unwrap_or_else(|| shape.parameter_at(point))
            };
            (parameter(ends.0), parameter(ends.1))
        }
        // An open piece of a periodic spline: the vertices fix where it runs,
        // the stored range only which turn. A reversed edge stores its range
        // negated (its parameter runs against the curve's), so read raw a
        // piece at [0, 1.18] evaluated at [-1.18, 0] and missed its vertices
        // by a whole unit (#1563).
        Some(shape @ Curve3::Nurbs(curve)) if apart => {
            let period = curve.domain().1 - curve.domain().0;
            let (near_low, near_high) = if edge_forward {
                (stored_low, stored_high)
            } else {
                (-stored_high, -stored_low)
            };
            let low = periodic_near(shape.parameter_at(ends.0), near_low, period);
            let mut high = periodic_near(shape.parameter_at(ends.1), near_high, period);
            while high <= low {
                high += period;
            }
            (low, high)
        }
        Some(shape @ (Curve3::Circle(_) | Curve3::Ellipse(_))) if apart => {
            let low = periodic_near(shape.parameter_at(ends.0), stored_low, TAU);
            let mut high = periodic_near(shape.parameter_at(ends.1), stored_high, TAU);
            while high <= low {
                high += TAU;
            }
            (low, high)
        }
        _ => (stored_low, stored_high),
    };
    let key = body.edges.insert(Edge {
        curve,
        start_parameter: low,
        end_parameter: high,
        start,
        end,
        coedges: Vec::new(),
        provenance: clean(record),
    });
    seen.edges.insert(index, key);
    Some(key)
}

fn periodic_near(value: f64, reference: f64, period: f64) -> f64 {
    value + period * ((reference - value) / period).round()
}

fn vertex_of(
    document: &SatDocument,
    body: &mut Body,
    seen: &mut Seen,
    loss: &mut Loss,
    pointer: SatPointer,
) -> Option<VertexKey> {
    let record = resolve(document, pointer)?;
    let index = index_of(record)?;
    if let Some(key) = seen.vertices.get(&index) {
        return Some(*key);
    }
    let source = SatVertex::from_record(record).or_else(|| {
        note_broken(loss, record);
        None
    })?;
    let point_record = resolve(document, source.point())?;
    let point = SatPoint::from_record(point_record).or_else(|| {
        note_broken(loss, point_record);
        None
    })?;
    let (x, y, z) = point.position();
    let key = body.vertices.insert(Vertex {
        point: [x, y, z],
        provenance: clean(record),
    });
    seen.vertices.insert(index, key);
    Some(key)
}

fn curve_of(
    document: &SatDocument,
    body: &mut Body,
    seen: &mut Seen,
    loss: &mut Loss,
    pointer: SatPointer,
    fallback: Option<Curve3>,
) -> Option<CurveKey> {
    let record = resolve(document, pointer)?;
    let index = index_of(record)?;
    if let Some(key) = seen.curves.get(&index) {
        return Some(*key);
    }
    let curve = read_curve(document, record).or(fallback).or_else(|| {
        // Not a kind the kernel has; the edge still exists and its record is
        // carried through, but nothing here can evaluate it.
        loss.curves.push(index as usize);
        None
    })?;
    let key = body.curves.insert(curve);
    seen.curves.insert(index, key);
    Some(key)
}

fn surface_curve(surface: &Surface, pcurve: &Curve2) -> Option<Curve3> {
    let Surface::Nurbs(surface) = surface else {
        return None;
    };
    let ((u0, u1), (v0, v1)) = surface.domain();
    let domain = [[u0, u1], [v0, v1]];
    let side = pcurve.rectangle_side(domain)?;
    let fixed = side / 2;
    Some(Curve3::Nurbs(
        surface.isocurve(fixed, domain[fixed][side % 2])?,
    ))
}

fn partner_surface_curve(
    document: &SatDocument,
    source: &SatCoedge<'_>,
) -> Option<Curve3> {
    let partner = SatCoedge::from_record(resolve(document, source.partner())?)?;
    let owner_loop = SatLoop::from_record(resolve(document, partner.owner_loop())?)?;
    let face = SatFace::from_record(resolve(document, owner_loop.face())?)?;
    let surface_record = resolve(document, face.surface())?;
    let reversed_v = analytic_surface_reversed(surface_record);
    let surface = read_surface(document, surface_record)?;
    let pcurve = read_pcurve(document, partner.pcurve(), reversed_v)?;
    surface_curve(&surface, &pcurve)
}

fn read_curve(document: &SatDocument, record: &SatRecord) -> Option<Curve3> {
    if let Some(line) = SatStraightCurve::from_record(record) {
        let (x, y, z) = line.root_point();
        let (dx, dy, dz) = line.direction();
        return Some(Curve3::Line(Line3 {
            origin: [x, y, z],
            direction: [dx, dy, dz],
        }));
    }
    if let Some(ellipse) = SatEllipseCurve::from_record(record) {
        let (cx, cy, cz) = ellipse.center();
        let (nx, ny, nz) = ellipse.normal();
        let (mx, my, mz) = ellipse.major_axis();
        let radius = Vec3::new(mx, my, mz).length();
        let plane = Plane::orthonormal([cx, cy, cz], [mx, my, mz], [nx, ny, nz])?;
        // A ratio of one is a circle, which is the overwhelming majority; the
        // rest is an ellipse and the kernel keeps it as one.
        return Some(if (ellipse.ratio() - 1.0).abs() < 1e-12 {
            Curve3::Circle(Circle3 { plane, radius })
        } else {
            Curve3::Ellipse(crate::brep::Ellipse3 {
                plane,
                major_radius: radius,
                minor_radius: radius * ellipse.ratio(),
            })
        });
    }
    if let Some(spline) = SatIntCurve::from_record(record) {
        let closed = spline.is_closed_in(document);
        let (degree, mut knots, mut controls) = spline.bspline_in(document).or_else(|| {
            let (surface, pcurve, offset) = spline.support_in(document)?;
            supported_curve(surface, pcurve, offset)
        })?;
        // A reversed intcurve runs against its spline: it is c(t) = s(-t),
        // and the edges on it store parameters in that negated range. Read
        // as the spline alone, a rim ran the wrong way round its face and
        // the face's boundary no longer closed (#1538).
        if record.token_sense(1) == Sense::Reversed {
            controls.reverse();
            knots = knots.into_iter().rev().map(|knot| -knot).collect();
        }
        let mut points = Vec::with_capacity(controls.len());
        let mut weights = Vec::with_capacity(controls.len());
        for control in controls {
            let weight = control[3];
            if !weight.is_finite() || weight <= 0.0 {
                return None;
            }
            points.push([
                control[0] / weight,
                control[1] / weight,
                control[2] / weight,
            ]);
            weights.push(weight);
        }
        return Some(Curve3::Nurbs(NurbsCurve3::new_strict(
            degree, points, knots, weights,
        )?
        .with_periodicity(closed)));
    }
    None
}

/// The part of a pcurve that traces its edge on `surface`, to a small share
/// of the edge's size: cut between where it passes the edge's two ends
/// (either way round), with every sample on the edge's own span. The whole
/// pcurve is taken when it fits; one covering more than its edge (a whole
/// ellipse under an arc) is cut down. One drawn in another surface's
/// parameters gives `None`, and the edge's curve is used instead. The two
/// need not run at the same speed — a seam's pcurve is linear where its
/// circle is not.
fn pcurve_on_edge(
    body: &Body,
    surface: SurfaceKey,
    edge: EdgeKey,
    pcurve: &Curve2,
) -> Option<Curve2> {
    let surface = body.surfaces.get(surface)?;
    let edge = body.edges.get(edge)?;
    let curve = body.curves.get(edge.curve)?;
    let Curve2::Nurbs(nurbs) = pcurve else {
        return None;
    };
    let span = edge.end_parameter - edge.start_parameter;
    let along: Vec<Vec3> = (0..=64)
        .map(|i| Vec3::from(curve.point_at(edge.start_parameter + span * i as f64 / 64.0)))
        .collect();
    let size = along
        .iter()
        .step_by(8)
        .flat_map(|a| along.iter().step_by(8).map(move |b| a.distance(*b)))
        .fold(0.0, f64::max);
    let tolerance = 1e-3 * size + 1e-6;
    let image_of = |curve: &NurbsCurve, t: f64| {
        let uv = curve.point_at(t);
        Vec3::from(surface.point_at(uv[0], uv[1]))
    };
    const STEPS: usize = 256;
    let samples: Vec<Vec3> = (0..=STEPS)
        .map(|i| image_of(nurbs, i as f64 / STEPS as f64))
        .collect();
    // Every stretch of the pcurve that passes within tolerance of `target`
    // gives one candidate: its closest sample, refined between neighbours.
    let landings = |target: Vec3| {
        let mut found = Vec::new();
        let mut run: Option<(usize, f64)> = None;
        for (i, sample) in samples.iter().enumerate() {
            let distance = sample.distance(target);
            if distance <= tolerance {
                if run.is_none_or(|(_, best)| distance < best) {
                    run = Some((i, distance));
                }
            } else if let Some((best, _)) = run.take() {
                found.push(best);
            }
        }
        found.extend(run.map(|(best, _)| best));
        found
            .into_iter()
            .map(|i| {
                let (mut low, mut high) = (
                    i.saturating_sub(1) as f64 / STEPS as f64,
                    (i + 1).min(STEPS) as f64 / STEPS as f64,
                );
                for _ in 0..40 {
                    let (a, b) = (low + (high - low) / 3.0, high - (high - low) / 3.0);
                    if image_of(nurbs, a).distance(target) < image_of(nurbs, b).distance(target) {
                        high = b;
                    } else {
                        low = a;
                    }
                }
                (low + high) / 2.0
            })
            .collect::<Vec<_>>()
    };
    let on_edge = |point: Vec3| {
        along.windows(2).any(|pair| {
            let (a, b) = (pair[0], pair[1]);
            let ab = b - a;
            let t = ((point - a).dot(ab) / ab.dot(ab).max(f64::MIN_POSITIVE)).clamp(0.0, 1.0);
            point.distance(a + ab * t) <= tolerance
        })
    };
    let whole = |from: f64, to: f64| from < 1e-6 && to > 1.0 - 1e-6;
    let (starts, ends) = (landings(along[0]), landings(along[along.len() - 1]));
    let mut spans: Vec<(f64, f64)> = starts
        .iter()
        .flat_map(|start| ends.iter().map(move |end| (start.min(*end), start.max(*end))))
        .filter(|(from, to)| to - from > 1e-9)
        .collect();
    // The pcurve as written wins over any cut of it.
    spans.sort_by_key(|(from, to)| !whole(*from, *to));
    spans.into_iter().find_map(|(from, to)| {
        let trimmed = if whole(from, to) {
            nurbs.clone()
        } else {
            nurbs.trimmed(from, to)?
        };
        (1..16)
            .all(|i| on_edge(image_of(&trimmed, i as f64 / 16.0)))
            .then_some(Curve2::Nurbs(trimmed))
    })
}

fn read_pcurve(
    document: &SatDocument,
    pointer: SatPointer,
    reversed_v: bool,
) -> Option<Curve2> {
    let source = SatPCurve::from_record(resolve(document, pointer)?)?;
    let (degree, knots, controls) = source.bspline_in(document)?;
    let mut points = Vec::with_capacity(controls.len());
    let mut weights = Vec::with_capacity(controls.len());
    for control in controls {
        let weight = control[2];
        if !weight.is_finite() || weight <= 0.0 {
            return None;
        }
        points.push([control[0] / weight, control[1] / weight]);
        weights.push(weight);
    }
    let curve = Curve2::Nurbs(NurbsCurve::new_strict(degree, points, knots, weights)?);
    let curve = if reversed_v {
        curve.transformed(&crate::geom2d::Transform::scale(1.0, -1.0))?
    } else {
        curve
    };
    Some(curve)
}

fn analytic_surface_reversed(record: &SatRecord) -> bool {
    SatPlaneSurface::from_record(record)
        .map(|surface| surface.sense())
        .or_else(|| SatConeSurface::from_record(record).map(|surface| surface.sense()))
        .or_else(|| SatSphereSurface::from_record(record).map(|surface| surface.sense()))
        .or_else(|| SatTorusSurface::from_record(record).map(|surface| surface.sense()))
        .is_some_and(|sense| sense == Sense::Reversed)
}

/// A cone record with a negative cosine has its normal towards the axis (the
/// inner wall of a swept bend, for example). The kernel's cones and
/// cylinders always face away from the axis, so the face turns instead.
fn cone_points_inward(record: &SatRecord) -> bool {
    SatConeSurface::from_record(record).is_some_and(|cone| cone.cos_half_angle() < 0.0)
}

fn surface_of(
    document: &SatDocument,
    body: &mut Body,
    seen: &mut Seen,
    loss: &mut Loss,
    pointer: SatPointer,
) -> Option<SurfaceKey> {
    let record = resolve(document, pointer)?;
    let index = index_of(record)?;
    if let Some(key) = seen.surfaces.get(&index) {
        return Some(*key);
    }
    let surface = read_surface(document, record).or_else(|| {
        loss.surfaces.push(index as usize);
        None
    })?;
    let key = body.surfaces.insert(surface);
    seen.surfaces.insert(index, key);
    Some(key)
}

fn read_surface(document: &SatDocument, record: &SatRecord) -> Option<Surface> {
    if let Some(plane) = SatPlaneSurface::from_record(record) {
        let (x, y, z) = plane.root_point();
        let (nx, ny, nz) = plane.normal();
        let (ux, uy, uz) = plane.u_direction();
        // The u direction is stored, so the frame comes from the file rather
        // than being invented — which is why the kernel's Plane takes axes.
        return Some(Surface::Plane(Plane::orthonormal(
            [x, y, z],
            [ux, uy, uz],
            [nx, ny, nz],
        )?));
    }
    if let Some(cone) = SatConeSurface::from_record(record) {
        let (cx, cy, cz) = cone.center();
        let (ax, ay, az) = cone.axis();
        let (mx, my, mz) = cone.major_axis();
        // The radius is the length of the major axis, not the `radius`
        // token — reading the token instead turns a disc into a ring.
        let radius = Vec3::new(mx, my, mz).length();
        let base = Plane::orthonormal([cx, cy, cz], [mx, my, mz], [ax, ay, az])?;
        // Only the ratio shapes the cone; a negative cosine flips the normal,
        // which `cone_points_inward` carries on the face.
        let (sine, cosine) = (cone.sin_half_angle(), cone.cos_half_angle());
        let (sine, cosine) = if cosine < 0.0 {
            (-sine, -cosine)
        } else {
            (sine, cosine)
        };
        if (cone.ratio() - 1.0).abs() > 1e-12 {
            let ratio = cone.ratio();
            if !ratio.is_finite() || ratio <= 0.0 {
                return None;
            }
            let normal = Vec3::from(base.normal()?);
            // Bound the finite rational patch by the source geometry's control hull.
            // Vertices alone miss extrema of closed or slanted trim curves.
            let height = |p: [f64; 3]| (Vec3::from(p) - Vec3::from(base.origin)).dot(normal);
            let mut heights: Vec<f64> = document
                .records_of_type("point")
                .into_iter()
                .filter_map(SatPoint::from_record)
                .map(|p| {
                    let (x, y, z) = p.position();
                    height([x, y, z])
                })
                .collect();
            for record in document.records_of_type("ellipse-curve") {
                if let Some(ellipse) = SatEllipseCurve::from_record(record) {
                    let (x, y, z) = ellipse.center();
                    let (xaxis, yaxis, zaxis) = ellipse.major_axis();
                    let extent =
                        Vec3::new(xaxis, yaxis, zaxis).length() * ellipse.ratio().abs().max(1.0);
                    let centre = height([x, y, z]);
                    heights.extend([centre - extent, centre + extent]);
                }
            }
            for record in document.records_of_type("intcurve-curve") {
                if let Some((_, _, controls)) =
                    SatIntCurve::from_record(record).and_then(|curve| curve.bspline_in(document))
                {
                    for control in controls {
                        if control[3] > 0.0 {
                            heights.push(height([
                                control[0] / control[3],
                                control[1] / control[3],
                                control[2] / control[3],
                            ]));
                        }
                    }
                }
            }
            heights.retain(|v| v.is_finite());
            let low = heights.iter().copied().fold(f64::INFINITY, f64::min);
            let high = heights.iter().copied().fold(f64::NEG_INFINITY, f64::max);
            if high <= low {
                return None;
            }
            let slope = sine / cosine;
            let circle = [
                [1., 0.],
                [1., 1.],
                [0., 1.],
                [-1., 1.],
                [-1., 0.],
                [-1., -1.],
                [0., -1.],
                [1., -1.],
                [1., 0.],
            ];
            let points = circle
                .iter()
                .map(|xy| {
                    [low, high]
                        .into_iter()
                        .map(|v| {
                            let r = radius + v * slope;
                            (Vec3::from(base.point_at([r * xy[0], r * ratio * xy[1]])) + normal * v)
                                .to_array()
                        })
                        .collect()
                })
                .collect();
            let weights = (0..9)
                .map(|i| {
                    vec![
                        if i % 2 == 0 {
                            1.0
                        } else {
                            std::f64::consts::FRAC_1_SQRT_2
                        };
                        2
                    ]
                })
                .collect();
            return Some(Surface::Nurbs(
                NurbsSurface3::new_strict(
                    2,
                    1,
                    points,
                    vec![0., 0., 0., 1., 1., 2., 2., 3., 3., 4., 4., 4.],
                    vec![low, low, high, high],
                    weights,
                )?
                .with_periodicity(true, false),
            ));
        }
        return Some(if sine.abs() < 1e-12 {
            Surface::Cylinder(Cylinder { base, radius })
        } else {
            Surface::Cone(Cone {
                base,
                radius,
                half_angle: -sine.atan2(cosine),
            })
        });
    }
    if let Some(sphere) = SatSphereSurface::from_record(record) {
        let (cx, cy, cz) = sphere.center();
        let (ux, uy, uz) = sphere.u_direction();
        let (px, py, pz) = sphere.pole();
        return Some(Surface::Sphere(Sphere {
            frame: Plane::orthonormal([cx, cy, cz], [ux, uy, uz], [px, py, pz])?,
            radius: sphere.radius(),
        }));
    }
    if let Some(torus) = SatTorusSurface::from_record(record) {
        let (cx, cy, cz) = torus.center();
        let (nx, ny, nz) = torus.normal();
        let (ux, uy, uz) = torus.u_direction();
        return Some(Surface::Torus(Torus {
            frame: Plane::orthonormal([cx, cy, cz], [ux, uy, uz], [nx, ny, nz])?,
            major_radius: torus.major_radius(),
            minor_radius: torus.minor_radius(),
        }));
    }
    if let Some(spline) = SatSplineSurface::from_record(record) {
        let reversed = spline.sense() == Sense::Reversed;
        let surface = match spline.bspline(document) {
            Some(fitted) => nurbs_surface(fitted)?,
            None => {
                let (base, distance) = spline.offset_in(document)?;
                offset_surface(&nurbs_surface(base)?, distance)?
            }
        };
        return Some(Surface::Nurbs(surface.with_v_reversed(reversed)));
    }
    None
}

fn nurbs_surface(spline: SatBSplineSurface) -> Option<NurbsSurface3> {
    let closed = |value: &Option<String>| {
        value
            .as_deref()
            .is_some_and(|value| matches!(value, "closed" | "periodic"))
    };
    let (u_closed, v_closed) = (closed(&spline.u_closure), closed(&spline.v_closure));
    let mut points = vec![vec![[0.0; 3]; spline.control_count_v]; spline.control_count_u];
    let mut weights = vec![vec![1.0; spline.control_count_v]; spline.control_count_u];
    for v in 0..spline.control_count_v {
        for u in 0..spline.control_count_u {
            let control = spline.control_points[v * spline.control_count_u + u];
            let weight = control[3];
            if !weight.is_finite() || weight <= 0.0 {
                return None;
            }
            points[u][v] = [
                control[0] / weight,
                control[1] / weight,
                control[2] / weight,
            ];
            weights[u][v] = weight;
        }
    }
    Some(
        NurbsSurface3::new_strict(
            spline.degree_u,
            spline.degree_v,
            points,
            spline.u_knots,
            spline.v_knots,
            weights,
        )?
        .with_periodicity(u_closed, v_closed),
    )
}

/// An offset surface saved without its fitted spline: points pushed
/// `distance` along the base's normal on a grid, interpolated row by row and
/// then column by column. Evenly spaced samples interpolated at even
/// parameters keep the base's `(u, v)`, so the face's pcurves still apply.
fn offset_surface(base: &NurbsSurface3, distance: f64) -> Option<NurbsSurface3> {
    let ((u0, u1), (v0, v1)) = base.domain();
    let rows = base.control_points();
    let (u_count, v_count) = ((rows.len() * 4).max(16), (rows.first()?.len() * 4).max(4));
    let at = |i: usize, count: usize, low: f64, high: f64| low + (high - low) * i as f64 / count as f64;
    let grid = (0..=v_count)
        .map(|j| {
            let v = at(j, v_count, v0, v1);
            (0..=u_count)
                .map(|i| {
                    let u = at(i, u_count, u0, u1);
                    let point = Vec3::from(base.point_at_knot(u, v));
                    let normal = Vec3::from(base.normal_at_knot(u, v)?);
                    Some((point + normal * distance).to_array())
                })
                .collect::<Option<Vec<_>>>()
        })
        .collect::<Option<Vec<_>>>()?;
    let [u_closed, v_closed] = base.periodicity();
    Some(interpolate_grid(&grid, (u0, u1), (v0, v1))?.with_periodicity(u_closed, v_closed))
}

/// A cubic surface through an evenly spaced grid of points (rows run along
/// `u`, one per `v`), interpolated row by row and then column by column.
/// Evenly spaced samples interpolated at even parameters keep the grid's own
/// `(u, v)`, so parameters read off the source still apply.
fn interpolate_grid(
    grid: &[Vec<[f64; 3]>],
    (u0, u1): (f64, f64),
    (v0, v1): (f64, f64),
) -> Option<NurbsSurface3> {
    let fit = |points: &[[f64; 3]]| {
        NurbsCurve3::interpolate_fit(points, None, None, crate::space::Parameterization::Uniform)
    };
    let rows = grid.iter().map(|row| fit(row)).collect::<Option<Vec<_>>>()?;
    let u_knots = rows.first()?.knots().to_vec();
    let mut points = Vec::new();
    let mut v_knots = Vec::new();
    for i in 0..rows.first()?.control_points().len() {
        let column: Vec<[f64; 3]> = rows.iter().map(|row| row.control_points()[i]).collect();
        let fitted = fit(&column)?;
        v_knots = fitted.knots().to_vec();
        points.push(fitted.control_points().to_vec());
    }
    let rescale = |knots: Vec<f64>, low: f64, high: f64| -> Vec<f64> {
        let (first, last) = (knots[0], knots[knots.len() - 1]);
        knots
            .iter()
            .map(|knot| low + (knot - first) / (last - first) * (high - low))
            .collect()
    };
    let weights = vec![vec![1.0; points.first()?.len()]; points.len()];
    NurbsSurface3::new_strict(
        3,
        3,
        points,
        rescale(u_knots, u0, u1),
        rescale(v_knots, v0, v1),
        weights,
    )
}

/// A stand-in for a surface the kernel cannot evaluate — a vertex blend
/// saves no fitted spline, only its boundary — filled over the face's own
/// outer loop: the loop seen along its mean normal, and each point inside
/// it the mean-value blend of the loop's points. It meets the face's edges
/// exactly and is smooth between them, which is what drawing the face
/// needs.
// ponytail: mean-value fill, not the blend's own surface; its cross-boundary
// tangents differ from the neighbouring blends'. Evaluate the blend itself
// if the seams show.
fn boundary_patch(document: &SatDocument, source: &SatFace<'_>) -> Option<Surface> {
    let ring = SatLoop::from_record(resolve(document, source.first_loop())?)?;
    let mut boundary: Vec<Vec3> = Vec::new();
    let first = ring.first_coedge();
    let mut pointer = first;
    loop {
        let coedge = SatCoedge::from_record(resolve(document, pointer)?)?;
        let edge = SatEdge::from_record(resolve(document, coedge.edge())?)?;
        let curve = read_curve(document, resolve(document, edge.curve())?)?;
        let (low, high) = (edge.start_param(), edge.end_param());
        let mut piece: Vec<Vec3> = (0..=8)
            .map(|i| Vec3::from(curve.point_at(low + (high - low) * i as f64 / 8.0)))
            .collect();
        // Pieces are chained by their ends rather than by their senses.
        if let Some(last) = boundary.last() {
            if piece[8].distance(*last) < piece[0].distance(*last) {
                piece.reverse();
            }
            boundary.extend(&piece[1..]);
        } else {
            boundary.extend(piece);
        }
        pointer = coedge.next();
        if pointer == first || boundary.len() > 4096 {
            break;
        }
    }
    if boundary.len() > 2 && boundary[0].distance(boundary[boundary.len() - 1]) < 1e-9 {
        boundary.pop();
    }
    if boundary.len() < 3 {
        return None;
    }
    let centre = boundary.iter().fold(Vec3::ZERO, |sum, point| sum + *point)
        * (1.0 / boundary.len() as f64);
    let newell = (0..boundary.len()).fold(Vec3::ZERO, |sum, index| {
        let (a, b) = (boundary[index] - centre, boundary[(index + 1) % boundary.len()] - centre);
        sum + a.cross(b)
    });
    // The first piece may have been chained backwards, reversing the walk.
    let ahead = boundary[1] - boundary[0];
    let expected = {
        let coedge = SatCoedge::from_record(resolve(document, first)?)?;
        let edge = SatEdge::from_record(resolve(document, coedge.edge())?)?;
        let curve = read_curve(document, resolve(document, edge.curve())?)?;
        let start = Vec3::from(curve.point_at(edge.start_param()));
        let end = Vec3::from(curve.point_at(edge.end_param()));
        (end - start) * if coedge.sense() == edge.sense() { 1.0 } else { -1.0 }
    };
    let walked_backwards = ahead.dot(expected) < 0.0;
    let face_normal = if walked_backwards { -newell } else { newell };
    let normal = if source.sense() == Sense::Forward { face_normal } else { -face_normal };
    let plane = Plane::orthonormal(
        centre.to_array(),
        (boundary[0] - centre).to_array(),
        normal.to_array(),
    )?;
    let flat: Vec<[f64; 2]> = boundary
        .iter()
        .map(|point| {
            let offset = *point - centre;
            [
                offset.dot(Vec3::from(plane.x_axis)),
                offset.dot(Vec3::from(plane.y_axis)),
            ]
        })
        .collect();
    let (mut low, mut high) = ([f64::INFINITY; 2], [f64::NEG_INFINITY; 2]);
    for point in &flat {
        for axis in 0..2 {
            low[axis] = low[axis].min(point[axis]);
            high[axis] = high[axis].max(point[axis]);
        }
    }
    let margin = (high[0] - low[0]).max(high[1] - low[1]) * 0.02;
    let (low, high) = (low.map(|value| value - margin), high.map(|value| value + margin));
    const STEPS: usize = 24;
    let grid: Vec<Vec<[f64; 3]>> = (0..=STEPS)
        .map(|j| {
            let y = low[1] + (high[1] - low[1]) * j as f64 / STEPS as f64;
            (0..=STEPS)
                .map(|i| {
                    let x = low[0] + (high[0] - low[0]) * i as f64 / STEPS as f64;
                    mean_value_point(&flat, &boundary, [x, y]).to_array()
                })
                .collect()
        })
        .collect();
    Some(Surface::Nurbs(interpolate_grid(
        &grid,
        (low[0], high[0]),
        (low[1], high[1]),
    )?))
}

/// The blend of `values` at `point` by its mean-value coordinates in the
/// polygon `corners`: each corner weighted by the half-angle tangents of the
/// two sides it closes. Exact on the polygon, smooth inside it.
fn mean_value_point(corners: &[[f64; 2]], values: &[Vec3], point: [f64; 2]) -> Vec3 {
    let count = corners.len();
    let spokes: Vec<[f64; 2]> = corners
        .iter()
        .map(|corner| [corner[0] - point[0], corner[1] - point[1]])
        .collect();
    let lengths: Vec<f64> = spokes.iter().map(|spoke| spoke[0].hypot(spoke[1])).collect();
    if let Some(index) = lengths.iter().position(|length| *length < 1e-12) {
        return values[index];
    }
    let half_tangents: Vec<f64> = (0..count)
        .map(|index| {
            let (a, b) = (spokes[index], spokes[(index + 1) % count]);
            let cross = a[0] * b[1] - a[1] * b[0];
            let dot = a[0] * b[0] + a[1] * b[1];
            let product = lengths[index] * lengths[(index + 1) % count];
            if cross.abs() < 1e-15 * product {
                0.0
            } else {
                (product - dot) / cross
            }
        })
        .collect();
    let mut total = 0.0;
    let mut sum = Vec3::ZERO;
    for index in 0..count {
        let weight = (half_tangents[(index + count - 1) % count] + half_tangents[index]) / lengths[index];
        total += weight;
        sum = sum + values[index] * weight;
    }
    if total.abs() < 1e-300 {
        return values[0];
    }
    sum * (1.0 / total)
}

/// A procedural curve saved without its spline, rebuilt from its support
/// surface and pcurve: sampled evenly in the curve's own parameter and
/// interpolated with the samples at those same parameters, so an edge's
/// stored span still selects the right piece.
fn supported_curve(
    surface: SatBSplineSurface,
    pcurve: (usize, Vec<f64>, Vec<[f64; 3]>),
    offset: f64,
) -> Option<(usize, Vec<f64>, Vec<[f64; 4]>)> {
    let surface = nurbs_surface(surface)?;
    let (degree, knots, controls) = pcurve;
    let mut points = Vec::with_capacity(controls.len());
    let mut weights = Vec::with_capacity(controls.len());
    for control in controls {
        if !control[2].is_finite() || control[2] <= 0.0 {
            return None;
        }
        points.push([control[0] / control[2], control[1] / control[2]]);
        weights.push(control[2]);
    }
    let pcurve = NurbsCurve::new_strict(degree, points, knots, weights)?;
    let (start, end) = pcurve.domain();
    const SAMPLES: usize = 64;
    let samples: Vec<[f64; 3]> = (0..=SAMPLES)
        .map(|i| {
            let [u, v] = pcurve.point_at_knot(start + (end - start) * i as f64 / SAMPLES as f64);
            let point = Vec3::from(surface.point_at_knot(u, v));
            if offset == 0.0 {
                return Some(point.to_array());
            }
            Some((point + Vec3::from(surface.normal_at_knot(u, v)?) * offset).to_array())
        })
        .collect::<Option<_>>()?;
    let fitted = NurbsCurve3::interpolate_fit(
        &samples,
        None,
        None,
        crate::space::Parameterization::Uniform,
    )?;
    let (low, high) = fitted.domain();
    let knots = fitted
        .knots()
        .iter()
        .map(|knot| start + (knot - low) / (high - low) * (end - start))
        .collect();
    let controls = fitted
        .control_points()
        .iter()
        .map(|point| [point[0], point[1], point[2], 1.0])
        .collect();
    Some((3, knots, controls))
}

fn resolve(document: &SatDocument, pointer: SatPointer) -> Option<&SatRecord> {
    (!pointer.is_null()).then(|| document.resolve(pointer)).flatten()
}

fn index_of(record: &SatRecord) -> Option<u32> {
    u32::try_from(record.index).ok()
}

fn clean(record: &SatRecord) -> Provenance {
    match index_of(record) {
        Some(index) => Provenance::Clean(SourceRef::new(index)),
        // A record with no usable index cannot be written back as itself, so
        // it is treated as something this kernel made up — which forces a
        // rebuild rather than a copy of a record it cannot find.
        None => Provenance::Synthesized,
    }
}

fn note_broken(loss: &mut Loss, record: &SatRecord) {
    if let Some(index) = index_of(record) {
        loss.broken.push(index as usize);
    }
}

#[cfg(test)]
mod elliptic_tests {
    use super::*;
    use opencadcodec::entities::acis::SatToken;

    #[test]
    fn preserves_elliptic_cone_sections_and_axial_extent() {
        let mut document = SatDocument::new();
        let null = SatToken::Pointer(SatPointer::new(-1));
        let record = SatRecord {
            index: 0,
            entity_type: "cone-surface".into(),
            sub_type: None,
            attribute: SatPointer::new(-1),
            subtype_id: -1,
            raw_text: None,
            tokens: vec![
                null.clone(),
                SatToken::Position(0., 0., 0.),
                SatToken::Position(0., 0., 1.),
                SatToken::Position(2., 0., 0.),
                SatToken::Float(0.5),
                SatToken::Ident("I".into()),
                SatToken::Ident("I".into()),
                SatToken::Float(0.),
                SatToken::Float(1.),
                SatToken::Float(2.),
            ],
        };
        for z in [-3., 4.] {
            document.add_record(SatRecord {
                index: -1,
                entity_type: "point".into(),
                sub_type: None,
                attribute: SatPointer::new(-1),
                subtype_id: -1,
                raw_text: None,
                tokens: vec![null.clone(), SatToken::Position(0., 0., z)],
            });
        }
        let surface = read_surface(&document, &record).unwrap();
        let Surface::Nurbs(nurbs) = &surface else {
            panic!("ellipse must retain both radii")
        };
        assert_eq!(nurbs.periodicity(), [true, false]);
        for i in 0..=32 {
            for z in [-3., 0., 4.] {
                let p = surface.point_at(i as f64 / 8., z);
                assert!((p[0] * p[0] / 4. + p[1] * p[1] - 1.).abs() < 1e-12);
                assert!((p[2] - z).abs() < 1e-12);
            }
        }
    }
}
