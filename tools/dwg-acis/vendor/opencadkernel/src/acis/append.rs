//! Writing a whole body into a document as new records.
//!
//! Records are allocated before their circular topology pointers are filled.

use opencadcodec::entities::acis::types::{SatDocument, SatPointer, SatRecord, SatToken};
use crate::brep::{
    Body, CoedgeKey, Curve3, CurveKey, EdgeKey, FaceKey, LoopKey, LumpKey, ShellKey, Surface,
    SurfaceKey, VertexKey,
};
use crate::geom2d::Curve as Curve2;
use crate::space::Vec3;
use std::collections::HashMap;

/// Why a body could not be written.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Unappendable {
    /// A curve or pcurve has no supported SAT record form.
    Curve,
    /// A surface whose frame is degenerate, so there is no normal to write.
    Surface,
    /// The body's own topology does not hold together. Writing it would
    /// produce a document that parses into something else.
    Inconsistent,
}

/// Where the body ended up.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Written {
    /// Record index of the `body` record.
    pub body: i32,
    /// How many records were added in total.
    pub records: usize,
}

/// Appends a body to a document as a fresh set of records.
///
/// The document keeps everything it already had; the body is added beside it.
/// A caller replacing an existing solid removes the old records itself —
/// which record refers to a body from outside the ACIS stream is the caller's
/// business, not this function's.
pub fn append(body: &Body, document: &mut SatDocument) -> Result<Written, Unappendable> {
    if !body.validate().is_empty() {
        return Err(Unappendable::Inconsistent);
    }
    let before = document.record_count();
    let mut ids = Ids::default();

    // First pass: every record, with geometry but no pointers.
    for (key, vertex) in body.vertices.iter() {
        let point = add(document, "point", vec![position(vertex.point)]);
        ids.points.insert(key, point);
        ids.vertices.insert(key, add(document, "vertex", Vec::new()));
    }
    for (key, curve) in body.curves.iter() {
        let id = add_curve(document, curve).ok_or(Unappendable::Curve)?;
        ids.curves.insert(key, id);
    }
    for (key, surface) in body.surfaces.iter() {
        let id = match surface {
            Surface::Nurbs(surface) => add_nurbs_surface(document, surface),
            _ => {
                let (kind, tokens) = surface_record(surface).ok_or(Unappendable::Surface)?;
                add(document, kind, tokens)
            }
        };
        ids.surfaces.insert(key, id);
    }
    for key in body.edges.keys() {
        ids.edges.insert(key, add(document, "edge", Vec::new()));
    }
    for (key, coedge) in body.coedges.iter() {
        if let Some(curve) = &coedge.pcurve {
            let face = body
                .loops
                .get(coedge.owner)
                .and_then(|ring| body.faces.get(ring.owner))
                .ok_or(Unappendable::Inconsistent)?;
            let needs_curve = matches!(body.surfaces.get(face.surface), Some(Surface::Nurbs(_)));
            match add_pcurve(document, curve, ids.surface(face.surface)) {
                Some(id) => {
                    ids.pcurves.insert(key, id);
                }
                None if needs_curve => return Err(Unappendable::Curve),
                None => {}
            }
        }
        ids.coedges.insert(key, add(document, "coedge", Vec::new()));
    }
    for key in body.loops.keys() {
        ids.loops.insert(key, add(document, "loop", Vec::new()));
    }
    for key in body.faces.keys() {
        ids.faces.insert(key, add(document, "face", Vec::new()));
    }
    for key in body.shells.keys() {
        ids.shells.insert(key, add(document, "shell", Vec::new()));
    }
    for key in body.lumps.keys() {
        ids.lumps.insert(key, add(document, "lump", Vec::new()));
    }
    let body_id = add(document, "body", Vec::new());

    // Second pass: the pointers, now that every index exists.
    for (key, vertex) in body.vertices.iter() {
        let edge = body
            .edges
            .iter()
            .find(|(_, node)| node.start == key || node.end == key)
            .map(|(edge, _)| ids.edge(edge))
            .unwrap_or(NULL);
        set(
            document,
            ids.vertex(key),
            vec![null(), pointer(edge), pointer(ids.point(key))],
        );
        let _ = vertex;
    }

    for (key, edge) in body.edges.iter() {
        let coedge = edge.coedges.first().map(|c| ids.coedge(*c)).unwrap_or(NULL);
        set(
            document,
            ids.edge(key),
            vec![
                null(),
                pointer(ids.vertex(edge.start)),
                SatToken::Float(edge.start_parameter),
                pointer(ids.vertex(edge.end)),
                SatToken::Float(edge.end_parameter),
                pointer(coedge),
                pointer(ids.curve(edge.curve)),
                sense(true),
            ],
        );
    }

    for (key, ring) in body.loops.iter() {
        let count = ring.coedges.len();
        for (order, coedge) in ring.coedges.iter().enumerate() {
            let node = body
                .coedges
                .get(*coedge)
                .ok_or(Unappendable::Inconsistent)?;
            let next = ring.coedges[(order + 1) % count];
            let previous = ring.coedges[(order + count - 1) % count];
            let partner = body.partner(*coedge).map(|c| ids.coedge(c)).unwrap_or(NULL);
            set(
                document,
                ids.coedge(*coedge),
                vec![
                    null(),
                    pointer(ids.coedge(next)),
                    pointer(ids.coedge(previous)),
                    pointer(partner),
                    pointer(ids.edge(node.edge)),
                    sense(node.forward),
                    pointer(ids.loop_(key)),
                    pointer(ids.pcurve(*coedge)),
                ],
            );
        }
        let face = body.faces.get(ring.owner).ok_or(Unappendable::Inconsistent)?;
        set(
            document,
            ids.loop_(key),
            vec![
                null(),
                pointer(next_in(&face.loops, key, &ids.loops)),
                pointer(ring.coedges.first().map(|c| ids.coedge(*c)).unwrap_or(NULL)),
                pointer(ids.face(ring.owner)),
            ],
        );
    }

    for (key, face) in body.faces.iter() {
        let shell = body.shells.get(face.owner).ok_or(Unappendable::Inconsistent)?;
        set(
            document,
            ids.face(key),
            vec![
                null(),
                pointer(next_in(&shell.faces, key, &ids.faces)),
                pointer(face.loops.first().map(|l| ids.loop_(*l)).unwrap_or(NULL)),
                pointer(ids.shell(face.owner)),
                null(),
                pointer(ids.surface(face.surface)),
                sense(face.forward),
                SatToken::Ident("single".to_string()),
            ],
        );
    }

    for (key, shell) in body.shells.iter() {
        let lump = body.lumps.get(shell.owner).ok_or(Unappendable::Inconsistent)?;
        set(
            document,
            ids.shell(key),
            vec![
                null(),
                pointer(next_in(&lump.shells, key, &ids.shells)),
                null(),
                pointer(shell.faces.first().map(|f| ids.face(*f)).unwrap_or(NULL)),
                null(),
                pointer(ids.lump(shell.owner)),
            ],
        );
    }

    for (key, lump) in body.lumps.iter() {
        set(
            document,
            ids.lump(key),
            vec![
                null(),
                pointer(next_in(&body.roots, key, &ids.lumps)),
                pointer(lump.shells.first().map(|s| ids.shell(*s)).unwrap_or(NULL)),
                pointer(body_id),
            ],
        );
    }

    let first_lump = body.roots.first().map(|l| ids.lump(*l)).unwrap_or(NULL);
    set(
        document,
        body_id,
        vec![null(), pointer(first_lump), null(), null()],
    );

    Ok(Written {
        body: body_id,
        records: document.record_count() - before,
    })
}

const NULL: i32 = -1;

/// The record after `key` in an ownership list, or null at the end.
///
/// ACIS strings siblings together rather than listing them, so a shell holds
/// its first face and every face holds the next. Getting this wrong loses
/// every face after the first without anything else noticing.
fn next_in<T: Copy + PartialEq + std::hash::Hash + Eq>(
    order: &[T],
    key: T,
    ids: &HashMap<T, i32>,
) -> i32 {
    order
        .iter()
        .position(|item| *item == key)
        .and_then(|at| order.get(at + 1))
        .and_then(|next| ids.get(next).copied())
        .unwrap_or(NULL)
}

#[derive(Default)]
struct Ids {
    points: HashMap<VertexKey, i32>,
    vertices: HashMap<VertexKey, i32>,
    curves: HashMap<CurveKey, i32>,
    surfaces: HashMap<SurfaceKey, i32>,
    edges: HashMap<EdgeKey, i32>,
    coedges: HashMap<CoedgeKey, i32>,
    pcurves: HashMap<CoedgeKey, i32>,
    loops: HashMap<LoopKey, i32>,
    faces: HashMap<FaceKey, i32>,
    shells: HashMap<ShellKey, i32>,
    lumps: HashMap<LumpKey, i32>,
}

macro_rules! lookup {
    ($name:ident, $field:ident, $key:ty) => {
        fn $name(&self, key: $key) -> i32 {
            self.$field.get(&key).copied().unwrap_or(NULL)
        }
    };
}

impl Ids {
    lookup!(point, points, VertexKey);
    lookup!(vertex, vertices, VertexKey);
    lookup!(curve, curves, CurveKey);
    lookup!(surface, surfaces, SurfaceKey);
    lookup!(edge, edges, EdgeKey);
    lookup!(coedge, coedges, CoedgeKey);
    lookup!(pcurve, pcurves, CoedgeKey);
    lookup!(loop_, loops, LoopKey);
    lookup!(face, faces, FaceKey);
    lookup!(shell, shells, ShellKey);
    lookup!(lump, lumps, LumpKey);
}

fn add(document: &mut SatDocument, kind: &str, mut tokens: Vec<SatToken>) -> i32 {
    // Every record leads with its attribute pointer; the accessors index from
    // one.
    let mut all = vec![null()];
    all.append(&mut tokens);
    document.add_record(SatRecord {
        index: -1,
        entity_type: kind.to_string(),
        sub_type: None,
        attribute: SatPointer::new(NULL),
        subtype_id: -1,
        tokens: all,
        raw_text: None,
    })
}

fn set(document: &mut SatDocument, id: i32, tokens: Vec<SatToken>) {
    // Ids from `add_record` are array positions, so this is a direct index
    // rather than a search.
    if let Some(record) = document.record_mut(id as usize) {
        record.tokens = tokens;
    }
}

fn distinct_knots(knots: &[f64]) -> Vec<(f64, i32)> {
    let mut out: Vec<(f64, i32)> = Vec::new();
    for knot in knots {
        match out.last_mut() {
            Some((value, multiplicity)) if *value == *knot => *multiplicity += 1,
            _ => out.push((*knot, 1)),
        }
    }
    out
}

fn add_nurbs_surface(document: &mut SatDocument, surface: &crate::space::NurbsSurface3) -> i32 {
    let (u_degree, v_degree) = surface.degrees();
    let (u_knots, v_knots) = surface.knots();
    let controls = surface.control_points();
    let weights = surface.weights();
    let rational = weights
        .iter()
        .flatten()
        .next()
        .is_some_and(|first| {
            weights
                .iter()
                .flatten()
                .any(|weight| (*weight - *first).abs() > 1e-12)
        });
    let mut points = Vec::new();
    let mut flat_weights = Vec::new();
    for v in 0..controls[0].len() {
        for u in 0..controls.len() {
            points.push(controls[u][v]);
            flat_weights.push(weights[u][v]);
        }
    }
    let periodic = surface.periodicity();
    document.add_spline_surface(
        surface.v_reversed(),
        rational,
        u_degree as i32,
        v_degree as i32,
        periodic[0],
        periodic[1],
        &distinct_knots(u_knots),
        &distinct_knots(v_knots),
        &points,
        rational.then_some(flat_weights.as_slice()),
        0.0,
    )
}

fn add_curve(document: &mut SatDocument, curve: &Curve3) -> Option<i32> {
    let spline = match curve {
        Curve3::PlanarSpline { plane, curve } => {
            let (start, end) = curve.domain();
            let width = end - start;
            if !width.is_finite() || width <= 0.0 {
                return None;
            }
            let knots = curve
                .knots()
                .iter()
                .map(|knot| (knot - start) / width)
                .collect();
            crate::space::NurbsCurve3::new_strict(
                curve.degree(),
                curve
                    .control_points()
                    .iter()
                    .map(|point| plane.point_at(*point))
                    .collect(),
                knots,
                curve.weights().to_vec(),
            )?
            .with_periodicity(curve.is_closed())
        }
        Curve3::Nurbs(curve) => curve.clone(),
        _ => {
            let (kind, tokens) = curve_record(curve)?;
            return Some(add(document, kind, tokens));
        }
    };
    Some(document.add_spline_curve(
        spline.is_rational(),
        spline.degree() as i32,
        spline.periodicity(),
        &distinct_knots(spline.knots()),
        spline.control_points(),
        spline.is_rational().then_some(spline.weights()),
        0.0,
    ))
}

fn add_pcurve(
    document: &mut SatDocument,
    curve: &Curve2,
    support_surface: i32,
) -> Option<i32> {
    let (degree, knots, controls, weights, rational, closed) = match curve {
        Curve2::Line(line) => (
            1,
            vec![0.0, 0.0, 1.0, 1.0],
            vec![line.start, line.end],
            vec![1.0, 1.0],
            false,
            false,
        ),
        Curve2::Nurbs(curve) => (
            curve.degree(),
            curve.knots().to_vec(),
            curve.control_points().to_vec(),
            curve.weights().to_vec(),
            curve.is_rational(),
            curve.point_at_knot(curve.domain().0) == curve.point_at_knot(curve.domain().1),
        ),
        _ => return None,
    };
    Some(document.add_pcurve(
        rational,
        degree as i32,
        closed,
        &distinct_knots(&knots),
        &controls,
        rational.then_some(weights.as_slice()),
        0.0,
        support_surface,
        // The spline knots carry the parameter interval. These are UV
        // translations on the support surface, not edge-domain endpoints.
        (0.0, 0.0),
    ))
}

pub(super) fn surface_record(surface: &Surface) -> Option<(&'static str, Vec<SatToken>)> {
    let frame = surface.frame()?;
    let normal = frame.normal()?;
    let origin = frame.origin;
    let u = frame.x_axis;
    Some(match surface {
        Surface::Plane(_) => (
            "plane-surface",
            vec![position(origin), position(normal), position(u)],
        ),
        Surface::Cylinder(cylinder) => (
            "cone-surface",
            cone_tokens(origin, normal, u, cylinder.radius, 0.0),
        ),
        Surface::Cone(cone) => (
            "cone-surface",
            cone_tokens(origin, normal, u, cone.radius, cone.half_angle),
        ),
        Surface::Sphere(sphere) => (
            "sphere-surface",
            vec![
                position(origin),
                SatToken::Float(sphere.radius),
                position(u),
                position(normal),
            ],
        ),
        Surface::Torus(torus) => (
            "torus-surface",
            vec![
                position(origin),
                position(normal),
                SatToken::Float(torus.major_radius),
                SatToken::Float(torus.minor_radius),
                position(u),
            ],
        ),
        Surface::Nurbs(_) => return None,
    })
}

/// A cone record, cylinder included — ACIS has no separate cylinder record,
/// only a cone whose half-angle is zero.
///
/// The radius is carried as the *length* of the major axis, which is how it
/// is read back; a unit major axis with the radius beside it produces a cone
/// of radius one. The two continuation tokens before the half-angle are not
/// decoration: the reader looks for the sine at thirteen.
fn cone_tokens(
    origin: [f64; 3],
    axis: [f64; 3],
    u: [f64; 3],
    radius: f64,
    half_angle: f64,
) -> Vec<SatToken> {
    let major = (Vec3::from(u) * radius).to_array();
    let (sine, cosine) = (-half_angle).sin_cos();
    vec![
        position(origin),
        position(axis),
        position(major),
        SatToken::Float(1.0),
        SatToken::Ident("I".to_string()),
        SatToken::Ident("I".to_string()),
        SatToken::Float(sine),
        SatToken::Float(cosine),
        SatToken::Float(radius),
    ]
}

pub(super) fn curve_record(curve: &Curve3) -> Option<(&'static str, Vec<SatToken>)> {
    Some(match curve {
        Curve3::Line(line) => (
            "straight-curve",
            vec![position(line.origin), position(line.direction)],
        ),
        Curve3::Circle(circle) => (
            "ellipse-curve",
            ellipse_tokens(
                circle.plane.origin,
                circle.plane.normal()?,
                circle.plane.x_axis,
                circle.radius,
                1.0,
            ),
        ),
        Curve3::Ellipse(ellipse) => (
            "ellipse-curve",
            ellipse_tokens(
                ellipse.plane.origin,
                ellipse.plane.normal()?,
                ellipse.plane.x_axis,
                ellipse.major_radius,
                ellipse.minor_radius / ellipse.major_radius,
            ),
        ),
        Curve3::PlanarSpline { .. } | Curve3::Nurbs(_) => return None,
    })
}

fn ellipse_tokens(
    centre: [f64; 3],
    normal: [f64; 3],
    u: [f64; 3],
    radius: f64,
    ratio: f64,
) -> Vec<SatToken> {
    vec![
        position(centre),
        position(normal),
        position((Vec3::from(u) * radius).to_array()),
        SatToken::Float(ratio),
    ]
}

pub(super) fn position(value: [f64; 3]) -> SatToken {
    SatToken::Position(value[0], value[1], value[2])
}

fn pointer(id: i32) -> SatToken {
    SatToken::Pointer(SatPointer::new(id))
}

pub(super) fn null() -> SatToken {
    pointer(NULL)
}

fn sense(forward: bool) -> SatToken {
    SatToken::Ident(if forward { "forward" } else { "reversed" }.to_string())
}
