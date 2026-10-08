//! Constant edge chamfers and fillets on convex planar solids.

use super::bounds::operation_tolerance;
use super::geometry::{Circle3, Curve3, Cylinder, Ellipse3, Line3, Sphere, Surface};
use super::topology::{Body, Coedge, Edge, EdgeKey, Face, FaceKey, Loop, Lump, Shell, Vertex};
use super::Provenance;
use crate::space::{Plane, Vec3};
use std::collections::{HashMap, HashSet};
use std::f64::consts::{PI, TAU};
use std::fmt;

#[derive(Clone, Copy)]
struct Halfspace {
    origin: Vec3,
    normal: Vec3,
    offset: f64,
    added: bool,
}

struct EdgeFrame {
    point: Vec3,
    axis: Vec3,
    faces: [FaceKey; 2],
    first_normal: Vec3,
    second_normal: Vec3,
    first_inward: Vec3,
    second_inward: Vec3,
    halfspaces: Vec<Halfspace>,
}

#[derive(Clone)]
struct ExistingFillet {
    cut: Halfspace,
    cylinder: Cylinder,
    forward: bool,
}

/// Why one or more selected edges could not be filleted.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FilletError {
    /// No edges were selected.
    EmptySelection,
    /// Radius was zero, negative, NaN or infinite.
    InvalidRadius,
    /// At least one selected key does not name an edge in this body.
    UnknownEdge,
    /// The input body's ownership or adjacency is inconsistent.
    InvalidBodyTopology,
    /// This operation currently accepts one lump, one shell and no face holes.
    UnsupportedBodyTopology,
    /// A selected edge is not straight.
    UnsupportedEdgeCurve(EdgeKey),
    /// A selected edge is not shared by exactly two faces.
    NonManifoldEdge(EdgeKey),
    /// A selected edge is not bounded by two planar faces.
    UnsupportedAdjacentSurface(EdgeKey),
    /// An edge or one of its adjacent surface frames is degenerate.
    DegenerateGeometry(EdgeKey),
    /// Adjacent selected edges need a corner-blend solver.
    AdjacentSelections(EdgeKey, EdgeKey),
    /// The body contains a surface this convex planar operation cannot preserve.
    UnsupportedBodySurface,
    /// The planar body is not the intersection of its face halfspaces.
    NonConvexBody,
    /// A previously created fillet does not have the supported cylindrical form.
    UnsupportedExistingFillet,
    /// Radius removes the body or makes selected blend regions meet.
    RadiusTooLargeOrInteracting,
    /// An end of the selected edge needs a non-circular cylinder section.
    UnsupportedEndCondition(EdgeKey),
    /// Constructed topology or edge geometry did not validate.
    InvalidResult,
}

impl fmt::Display for FilletError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptySelection => formatter.write_str("no edges were selected"),
            Self::InvalidRadius => formatter.write_str("fillet radius must be finite and positive"),
            Self::UnknownEdge => formatter.write_str("a selected edge does not belong to the body"),
            Self::InvalidBodyTopology => formatter.write_str("the input body has invalid topology"),
            Self::UnsupportedBodyTopology => formatter.write_str(
                "filleting currently requires one lump, one shell and faces without holes",
            ),
            Self::UnsupportedEdgeCurve(edge) => {
                write!(formatter, "selected edge {edge:?} is not straight")
            }
            Self::NonManifoldEdge(edge) => write!(
                formatter,
                "selected edge {edge:?} is not shared by exactly two faces"
            ),
            Self::UnsupportedAdjacentSurface(edge) => write!(
                formatter,
                "selected edge {edge:?} is not bounded by two planar faces"
            ),
            Self::DegenerateGeometry(edge) => {
                write!(formatter, "selected edge {edge:?} has degenerate geometry")
            }
            Self::AdjacentSelections(first, second) => write!(
                formatter,
                "selected edges {first:?} and {second:?} meet; corner blends are unsupported"
            ),
            Self::UnsupportedBodySurface => formatter.write_str(
                "the body contains a surface this convex planar fillet cannot preserve",
            ),
            Self::NonConvexBody => {
                formatter.write_str("the body is not a convex intersection of planar halfspaces")
            }
            Self::UnsupportedExistingFillet => formatter.write_str(
                "an existing cylindrical face is not a supported constant edge fillet",
            ),
            Self::RadiusTooLargeOrInteracting => formatter.write_str(
                "the radius removes the body or makes selected fillet regions interact",
            ),
            Self::UnsupportedEndCondition(edge) => write!(
                formatter,
                "selected edge {edge:?} needs an unsupported fillet end condition"
            ),
            Self::InvalidResult => formatter.write_str("the filleted body did not validate"),
        }
    }
}

impl std::error::Error for FilletError {}

/// Why one or more selected edges could not be chamfered.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChamferError {
    EmptySelection,
    InvalidDistance,
    UnknownEdge,
    UnknownBaseFace,
    EdgeOutsideBaseFace(EdgeKey),
    InvalidBodyTopology,
    UnsupportedBodyTopology,
    UnsupportedEdgeCurve(EdgeKey),
    NonManifoldEdge(EdgeKey),
    UnsupportedAdjacentSurface(EdgeKey),
    DegenerateGeometry(EdgeKey),
    UnsupportedBodySurface,
    NonConvexBody,
    UnsupportedExistingFillet,
    DistanceTooLargeOrInteracting,
    InvalidResult,
}

impl fmt::Display for ChamferError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptySelection => formatter.write_str("no edges were selected"),
            Self::InvalidDistance => {
                formatter.write_str("chamfer distances must be finite and positive")
            }
            Self::UnknownEdge => formatter.write_str("a selected edge does not belong to the body"),
            Self::UnknownBaseFace => formatter.write_str("the base face does not belong to the body"),
            Self::EdgeOutsideBaseFace(edge) => write!(
                formatter,
                "selected edge {edge:?} does not belong to the common base face"
            ),
            Self::InvalidBodyTopology => formatter.write_str("the input body has invalid topology"),
            Self::UnsupportedBodyTopology => formatter.write_str(
                "chamfering currently requires one lump, one shell and faces without holes",
            ),
            Self::UnsupportedEdgeCurve(edge) => {
                write!(formatter, "selected edge {edge:?} is not straight")
            }
            Self::NonManifoldEdge(edge) => write!(
                formatter,
                "selected edge {edge:?} is not shared by exactly two faces"
            ),
            Self::UnsupportedAdjacentSurface(edge) => write!(
                formatter,
                "selected edge {edge:?} is not bounded by two planar faces"
            ),
            Self::DegenerateGeometry(edge) => {
                write!(formatter, "selected edge {edge:?} has degenerate geometry")
            }
            Self::UnsupportedBodySurface => formatter.write_str(
                "the body contains a surface this convex planar chamfer cannot preserve",
            ),
            Self::NonConvexBody => {
                formatter.write_str("the body is not a convex intersection of planar halfspaces")
            }
            Self::UnsupportedExistingFillet => formatter.write_str(
                "an existing cylindrical face is not a supported constant edge fillet",
            ),
            Self::DistanceTooLargeOrInteracting => formatter.write_str(
                "a distance removes the body or makes selected chamfer regions interact",
            ),
            Self::InvalidResult => formatter.write_str("the chamfered body did not validate"),
        }
    }
}

impl std::error::Error for ChamferError {}

/// Cuts a symmetric chamfer at one straight edge.
pub fn chamfer(body: &Body, edge: EdgeKey, distance: f64) -> Option<Body> {
    let frame = edge_frame(body, edge)?;
    chamfer_edges(body, &[edge], frame.faces[0], distance, distance).ok()
}

/// Bevels several straight edges on one base face in one atomic operation.
///
/// `base_distance` is measured on `base_face`; `other_distance` is measured
/// on the other face adjacent to each selected edge. Selection order and
/// duplicate keys do not affect the result.
pub fn chamfer_edges(
    body: &Body,
    selected: &[EdgeKey],
    base_face: FaceKey,
    base_distance: f64,
    other_distance: f64,
) -> Result<Body, ChamferError> {
    if !base_distance.is_finite()
        || !other_distance.is_finite()
        || base_distance <= 0.0
        || other_distance <= 0.0
    {
        return Err(ChamferError::InvalidDistance);
    }
    if selected.is_empty() {
        return Err(ChamferError::EmptySelection);
    }
    if !body.validate().is_empty() {
        return Err(ChamferError::InvalidBodyTopology);
    }
    if !body.faces.contains(base_face) {
        return Err(ChamferError::UnknownBaseFace);
    }
    if selected.iter().any(|edge| !body.edges.contains(*edge)) {
        return Err(ChamferError::UnknownEdge);
    }

    let mut selected = selected.to_vec();
    selected.sort_by_key(EdgeKey::slot);
    selected.dedup();
    if let Some(result) = super::chamfer_circular::chamfer_circular(
        body,
        &selected,
        base_face,
        base_distance,
        other_distance,
    ) {
        return result;
    }
    if let Some(result) = super::chamfer_prismatic::chamfer_prismatic(
        body,
        &selected,
        base_face,
        base_distance,
        other_distance,
    ) {
        return result;
    }
    let tolerance = operation_tolerance(&[body]);
    if is_open_sheet(body) {
        return chamfer_sheet(
            body,
            &selected,
            base_face,
            base_distance,
            other_distance,
            tolerance,
        );
    }
    let existing = existing_fillets(body).ok_or(ChamferError::UnsupportedExistingFillet)?;
    let corners = existing_corners(body).ok_or(ChamferError::UnsupportedExistingFillet)?;
    validate_chamfer_body(body, &existing, tolerance)?;

    let mut frames = Vec::with_capacity(selected.len());
    for edge in selected {
        validate_chamfer_edge(body, edge)?;
        let frame = edge_frame(body, edge).ok_or(ChamferError::DegenerateGeometry(edge))?;
        if !frame.faces.contains(&base_face) {
            return Err(ChamferError::EdgeOutsideBaseFace(edge));
        }
        frames.push((edge, frame));
    }

    let mut halfspaces = frames[0].1.halfspaces.clone();
    for (edge, frame) in &frames {
        let distances = if frame.faces[0] == base_face {
            (base_distance, other_distance)
        } else {
            (other_distance, base_distance)
        };
        let cut = cut_halfspace_distances(frame, distances.0, distances.1, tolerance)
            .ok_or(ChamferError::DegenerateGeometry(*edge))?;
        halfspaces.push(cut);
    }
    let (mut result, _) = convex_body(&halfspaces, tolerance)
        .ok_or(ChamferError::DistanceTooLargeOrInteracting)?;
    restore_fillets(&mut result, &existing, &corners, tolerance)
        .ok_or(ChamferError::UnsupportedExistingFillet)?;
    if !result.validate().is_empty()
        || result.worst_vertex_gap() > tolerance
        || !blend_boundaries_fit(&result, tolerance)
    {
        return Err(ChamferError::InvalidResult);
    }
    Ok(result)
}

fn is_open_sheet(body: &Body) -> bool {
    body.edges.iter().any(|(_, edge)| edge.coedges.len() == 1)
        && body.edges.iter().all(|(_, edge)| !edge.coedges.is_empty() && edge.coedges.len() <= 2)
}

fn chamfer_sheet(
    body: &Body,
    selected: &[EdgeKey],
    base_face: FaceKey,
    base_distance: f64,
    other_distance: f64,
    tolerance: f64,
) -> Result<Body, ChamferError> {
    if body.roots.len() != 1
        || body
            .lumps
            .get(body.roots[0])
            .is_none_or(|lump| lump.shells.len() != 1)
        || body.faces.iter().any(|(_, face)| face.loops.len() != 1)
        || body.faces.iter().any(|(_, face)| {
            !matches!(body.surfaces.get(face.surface), Some(Surface::Plane(_)))
        })
    {
        return Err(ChamferError::UnsupportedBodyTopology);
    }
    let (supports, boundaries) = sheet_halfspaces(body, tolerance)
        .ok_or(ChamferError::UnsupportedBodySurface)?;
    let mut halfspaces = supports
        .iter()
        .map(|(_, halfspace)| *halfspace)
        .chain(boundaries)
        .collect::<Vec<_>>();
    let mut cuts = Vec::with_capacity(selected.len());
    for edge in selected {
        validate_chamfer_edge(body, *edge)?;
        let frame = sheet_edge_frame(body, *edge, &supports, halfspaces.clone())
            .ok_or(ChamferError::DegenerateGeometry(*edge))?;
        if !frame.faces.contains(&base_face) {
            return Err(ChamferError::EdgeOutsideBaseFace(*edge));
        }
        let distances = if frame.faces[0] == base_face {
            (base_distance, other_distance)
        } else {
            (other_distance, base_distance)
        };
        let cut = cut_halfspace_distances(&frame, distances.0, distances.1, tolerance)
            .ok_or(ChamferError::DegenerateGeometry(*edge))?;
        halfspaces.push(cut);
        cuts.push(cut);
    }
    let (closed, _) = convex_body(&halfspaces, tolerance)
        .ok_or(ChamferError::DistanceTooLargeOrInteracting)?;
    let kept = supports
        .iter()
        .map(|(_, halfspace)| *halfspace)
        .chain(cuts)
        .filter_map(|halfspace| face_on(&closed, halfspace, tolerance))
        .collect::<HashSet<_>>();
    if kept.len() < supports.len() + selected.len() {
        return Err(ChamferError::DistanceTooLargeOrInteracting);
    }

    let mut result = Body::new();
    let lump = result.lumps.insert(Lump {
        shells: Vec::new(),
        provenance: Provenance::Synthesized,
    });
    let shell = result.shells.insert(Shell {
        faces: Vec::new(),
        owner: lump,
        provenance: Provenance::Synthesized,
    });
    let mut kept = kept.into_iter().collect::<Vec<_>>();
    kept.sort_by_key(FaceKey::slot);
    for face in kept {
        super::boolean::copy_face(&mut result, &closed, face, shell, false)
            .map_err(|_| ChamferError::InvalidResult)?;
    }
    result.lumps.get_mut(lump).ok_or(ChamferError::InvalidResult)?.shells = vec![shell];
    result.roots = vec![lump];
    if !result.validate().is_empty()
        || result.worst_vertex_gap() > tolerance
        || !blend_boundaries_fit(&result, tolerance)
    {
        return Err(ChamferError::InvalidResult);
    }
    Ok(result)
}

fn sheet_halfspaces(
    body: &Body,
    tolerance: f64,
) -> Option<(Vec<(FaceKey, Halfspace)>, Vec<Halfspace>)> {
    let points = body
        .vertices
        .iter()
        .map(|(_, vertex)| Vec3::from(vertex.point))
        .collect::<Vec<_>>();
    let centre = points.iter().copied().fold(Vec3::ZERO, |sum, point| sum + point)
        / points.len() as f64;
    let mut supports = Vec::new();
    for (face_key, face) in body.faces.iter() {
        let Surface::Plane(plane) = body.surfaces.get(face.surface)? else {
            return None;
        };
        let mut normal = Vec3::from(plane.normal()?);
        let mut offset = normal.dot(Vec3::from(plane.origin));
        if normal.dot(centre) > offset {
            normal = -normal;
            offset = -offset;
        }
        supports.push((face_key, Halfspace {
            origin: Vec3::from(plane.origin),
            normal,
            offset,
            added: false,
        }));
    }

    let mut boundaries = Vec::new();
    for (_, edge) in body.edges.iter().filter(|(_, edge)| edge.coedges.len() == 1) {
        let coedge = body.coedges.get(edge.coedges[0])?;
        let face = body.loops.get(coedge.owner)?.owner;
        let face_normal = supports.iter().find(|(key, _)| *key == face)?.1.normal;
        let start = Vec3::from(body.vertices.get(edge.start)?.point);
        let end = Vec3::from(body.vertices.get(edge.end)?.point);
        let axis = (end - start).normalize()?;
        let face_points = body
            .face_coedges(face)
            .into_iter()
            .filter_map(|key| body.coedges.get(key))
            .filter_map(|coedge| body.edges.get(coedge.edge))
            .flat_map(|edge| [edge.start, edge.end])
            .filter_map(|vertex| body.vertices.get(vertex))
            .map(|vertex| Vec3::from(vertex.point))
            .collect::<Vec<_>>();
        let face_centre = face_points
            .iter()
            .copied()
            .fold(Vec3::ZERO, |sum, point| sum + point)
            / face_points.len() as f64;
        let mut normal = face_normal.cross(axis).normalize()?;
        let mut offset = normal.dot(start);
        if normal.dot(face_centre) > offset + tolerance {
            normal = -normal;
            offset = -offset;
        }
        if supports.iter().any(|(_, candidate)| same_halfspace(*candidate, normal, offset, tolerance))
            || boundaries
                .iter()
                .any(|candidate| same_halfspace(*candidate, normal, offset, tolerance))
        {
            continue;
        }
        boundaries.push(Halfspace {
            origin: start,
            normal,
            offset,
            added: false,
        });
    }
    Some((supports, boundaries))
}

fn same_halfspace(
    candidate: Halfspace,
    normal: Vec3,
    offset: f64,
    tolerance: f64,
) -> bool {
    candidate.normal.dot(normal) > 1.0 - 1.0e-8
        && (candidate.offset - offset).abs() <= tolerance
}

fn sheet_edge_frame(
    body: &Body,
    edge_key: EdgeKey,
    supports: &[(FaceKey, Halfspace)],
    halfspaces: Vec<Halfspace>,
) -> Option<EdgeFrame> {
    let edge = body.edges.get(edge_key)?;
    if !matches!(body.curves.get(edge.curve)?, Curve3::Line(_)) || edge.coedges.len() != 2 {
        return None;
    }
    let start = Vec3::from(body.vertices.get(edge.start)?.point);
    let end = Vec3::from(body.vertices.get(edge.end)?.point);
    let axis = (end - start).normalize()?;
    let face_of = |coedge| {
        let loop_key = body.coedges.get(coedge)?.owner;
        Some(body.loops.get(loop_key)?.owner)
    };
    let faces = [face_of(edge.coedges[0])?, face_of(edge.coedges[1])?];
    let normal_of = |face| supports.iter().find(|(key, _)| *key == face).map(|(_, value)| value.normal);
    let first_normal = normal_of(faces[0])?;
    let second_normal = normal_of(faces[1])?;
    let dot = first_normal.dot(second_normal);
    if dot.abs() > 1.0 - 1.0e-9 {
        return None;
    }
    let first_inward = -(second_normal - first_normal * dot).normalize()?;
    let second_inward = -(first_normal - second_normal * dot).normalize()?;
    Some(EdgeFrame {
        point: start,
        axis,
        faces,
        first_normal,
        second_normal,
        first_inward,
        second_inward,
        halfspaces,
    })
}

/// Rounds one straight edge with a constant-radius cylindrical face.
pub fn fillet(body: &Body, edge: EdgeKey, radius: f64) -> Option<Body> {
    fillet_edges(body, &[edge], radius).ok()
}

/// Rounds several straight edges in one atomic operation.
///
/// Selection order and duplicate keys do not affect the result. Orthogonal
/// corners use exact elliptical seams or spherical three-edge patches.
pub fn fillet_edges(
    body: &Body,
    selected: &[EdgeKey],
    radius: f64,
) -> Result<Body, FilletError> {
    if !radius.is_finite() || radius <= 0.0 {
        return Err(FilletError::InvalidRadius);
    }
    if selected.is_empty() {
        return Err(FilletError::EmptySelection);
    }
    if !body.validate().is_empty() {
        return Err(FilletError::InvalidBodyTopology);
    }
    if selected.iter().any(|edge| !body.edges.contains(*edge)) {
        return Err(FilletError::UnknownEdge);
    }

    let mut selected = selected.to_vec();
    selected.sort_by_key(EdgeKey::slot);
    selected.dedup();
    if let Some(result) = super::fillet_circular::fillet_circular(body, &selected, radius) {
        return result;
    }
    if let Some(result) = super::fillet_prismatic::fillet_prismatic(body, &selected, radius) {
        return result;
    }

    let tolerance = operation_tolerance(&[body]);
    let existing = existing_fillets(body).ok_or(FilletError::UnsupportedExistingFillet)?;
    let old_corners = existing_corners(body).ok_or(FilletError::UnsupportedExistingFillet)?;
    validate_supported_body(body, &existing, tolerance)?;

    let mut frames = Vec::with_capacity(selected.len());
    for edge in &selected {
        validate_selected_edge(body, *edge)?;
        let frame = edge_frame(body, *edge).ok_or(FilletError::DegenerateGeometry(*edge))?;
        frames.push((*edge, frame));
    }
    reject_interacting_regions(body, &selected, radius, tolerance)?;

    let mut halfspaces = frames[0].1.halfspaces.clone();
    let mut blends = Vec::with_capacity(frames.len());
    for (edge, frame) in &frames {
        let (cut, cylinder) = fillet_geometry(frame, radius, tolerance)
            .ok_or(FilletError::DegenerateGeometry(*edge))?;
        halfspaces.push(cut);
        blends.push((*edge, cut, cylinder));
    }
    let corners = corner_blends(body, &selected, radius, tolerance)?;
    halfspaces.extend(corners.iter().map(|(cut, _)| *cut));
    let (mut result, _) = convex_body(&halfspaces, tolerance)
        .ok_or(FilletError::RadiusTooLargeOrInteracting)?;

    let mut occupied = HashSet::new();
    let mut existing_faces = Vec::with_capacity(existing.len());
    for old in &existing {
        let face = face_on(&result, old.cut, tolerance)
            .ok_or(FilletError::RadiusTooLargeOrInteracting)?;
        if !occupied.insert(face) {
            return Err(FilletError::RadiusTooLargeOrInteracting);
        }
        existing_faces.push(face);
    }
    let mut targets = Vec::with_capacity(blends.len());
    for (edge, cut, cylinder) in blends {
        let face = face_on(&result, cut, tolerance)
            .ok_or(FilletError::RadiusTooLargeOrInteracting)?;
        if !occupied.insert(face) {
            return Err(FilletError::RadiusTooLargeOrInteracting);
        }
        if existing_faces
            .iter()
            .any(|existing| faces_touch(&result, *existing, face))
        {
            return Err(FilletError::RadiusTooLargeOrInteracting);
        }
        targets.push((edge, face, cylinder));
    }
    restore_fillets(&mut result, &existing, &old_corners, tolerance)
        .ok_or(FilletError::UnsupportedExistingFillet)?;
    // Assign every support first: a shared seam must see both true surfaces,
    // rather than the temporary halfspace faces used to build connectivity.
    for (_, face, cylinder) in &targets {
        let surface = result.faces.get(*face).ok_or(FilletError::InvalidResult)?.surface;
        *result.surfaces.get_mut(surface).ok_or(FilletError::InvalidResult)? =
            Surface::Cylinder(*cylinder);
    }
    for (cut, sphere) in corners {
        let face = face_on(&result, cut, tolerance)
            .ok_or(FilletError::RadiusTooLargeOrInteracting)?;
        let surface = result.faces.get(face).ok_or(FilletError::InvalidResult)?.surface;
        *result.surfaces.get_mut(surface).ok_or(FilletError::InvalidResult)? =
            Surface::Sphere(sphere);
    }
    for (edge, face, cylinder) in targets {
        if round_face(&mut result, face, &cylinder, true, tolerance)
            .filter(|rounded| *rounded == 2)
            .is_none()
        {
            return Err(FilletError::UnsupportedEndCondition(edge));
        }
    }
    if !result.validate().is_empty() || result.worst_vertex_gap() > tolerance
        || !blend_boundaries_fit(&result, tolerance)
    {
        return Err(FilletError::InvalidResult);
    }
    Ok(result)
}

/// Moves a planar face while extending or trimming its neighbouring surfaces.
pub fn presspull(body: &Body, face_key: FaceKey, distance: f64) -> Option<Body> {
    super::presspull_face(body, face_key, distance, super::PresspullMode::Offset)
}

fn circle_parameters(plane: &Plane, start: Vec3, end: Vec3) -> Option<(f64, f64)> {
    let parameter = |point: Vec3| {
        let local = plane.project(point.to_array())?;
        Some(local[1].atan2(local[0]))
    };
    let start = parameter(start)?;
    let span = (parameter(end)? - start).rem_euclid(TAU);
    (span > 1e-12).then_some((start, start + span))
}

fn cut_halfspace(frame: &EdgeFrame, setback: f64, tolerance: f64) -> Option<Halfspace> {
    cut_halfspace_distances(frame, setback, setback, tolerance)
}

fn cut_halfspace_distances(
    frame: &EdgeFrame,
    first_setback: f64,
    second_setback: f64,
    tolerance: f64,
) -> Option<Halfspace> {
    if !first_setback.is_finite()
        || !second_setback.is_finite()
        || first_setback <= 0.0
        || second_setback <= 0.0
    {
        return None;
    }
    let first = frame.point + frame.first_inward * first_setback;
    let second = frame.point + frame.second_inward * second_setback;
    let chord = second - first;
    let mut normal = frame.axis.cross(chord).normalize()?;
    if normal.dot(frame.first_normal + frame.second_normal) < 0.0 {
        normal = -normal;
    }
    let offset = 0.5 * (normal.dot(first) + normal.dot(second));
    let added = Halfspace {
        origin: first,
        normal,
        offset,
        added: true,
    };
    if normal.dot(frame.point) <= offset + tolerance {
        return None;
    }
    Some(added)
}

fn fillet_geometry(
    frame: &EdgeFrame,
    radius: f64,
    tolerance: f64,
) -> Option<(Halfspace, Cylinder)> {
    let normals_angle = frame
        .first_normal
        .dot(frame.second_normal)
        .clamp(-1.0, 1.0)
        .acos();
    let interior = PI - normals_angle;
    let setback = radius / (interior * 0.5).tan();
    let cut = cut_halfspace(frame, setback, tolerance)?;
    if cut.normal.dot(frame.first_normal + frame.second_normal) <= 0.0 {
        return None;
    }
    let tangent = frame.point + frame.first_inward * setback;
    let centre = tangent - frame.first_normal * radius;
    let base = Plane::orthonormal(
        centre.to_array(),
        frame.first_normal.to_array(),
        frame.axis.to_array(),
    )?;
    Some((cut, Cylinder { base, radius }))
}

fn edge_frame(body: &Body, edge_key: EdgeKey) -> Option<EdgeFrame> {
    let edge = body.edges.get(edge_key)?;
    if !matches!(body.curves.get(edge.curve)?, Curve3::Line(_)) || edge.coedges.len() != 2 {
        return None;
    }
    let start = Vec3::from(body.vertices.get(edge.start)?.point);
    let end = Vec3::from(body.vertices.get(edge.end)?.point);
    let axis = (end - start).normalize()?;
    let face_of = |coedge| {
        let loop_key = body.coedges.get(coedge)?.owner;
        Some(body.loops.get(loop_key)?.owner)
    };
    let faces = [face_of(edge.coedges[0])?, face_of(edge.coedges[1])?];
    let plane_of = |face_key| {
        let face = body.faces.get(face_key)?;
        let Surface::Plane(plane) = body.surfaces.get(face.surface)? else {
            return None;
        };
        let mut normal = Vec3::from(plane.normal()?);
        if !face.forward {
            normal = -normal;
        }
        Some(normal)
    };
    let first_normal = plane_of(faces[0])?;
    let second_normal = plane_of(faces[1])?;
    let dot = first_normal.dot(second_normal);
    if dot.abs() > 1.0 - 1e-9 {
        return None;
    }
    let first_inward = -(second_normal - first_normal * dot).normalize()?;
    let second_inward = -(first_normal - second_normal * dot).normalize()?;
    let mut halfspaces = Vec::new();
    for (_, face) in body.faces.iter() {
        let Some(Surface::Plane(plane)) = body.surfaces.get(face.surface) else {
            continue;
        };
        let mut normal = Vec3::from(plane.normal()?);
        if !face.forward {
            normal = -normal;
        }
        halfspaces.push(Halfspace {
            origin: Vec3::from(plane.origin),
            normal,
            offset: normal.dot(Vec3::from(plane.origin)),
            added: false,
        });
    }
    halfspaces.extend(existing_fillets(body)?.into_iter().map(|fillet| fillet.cut));
    halfspaces.extend(existing_corners(body)?.into_iter().map(|(cut, _)| cut));
    Some(EdgeFrame {
        point: start,
        axis,
        faces,
        first_normal,
        second_normal,
        first_inward,
        second_inward,
        halfspaces,
    })
}

fn validate_selected_edge(body: &Body, edge_key: EdgeKey) -> Result<(), FilletError> {
    let edge = body.edges.get(edge_key).ok_or(FilletError::UnknownEdge)?;
    if !matches!(body.curves.get(edge.curve), Some(Curve3::Line(_))) {
        return Err(FilletError::UnsupportedEdgeCurve(edge_key));
    }
    if edge.coedges.len() != 2 {
        return Err(FilletError::NonManifoldEdge(edge_key));
    }
    let start = body
        .vertices
        .get(edge.start)
        .ok_or(FilletError::InvalidBodyTopology)?;
    let end = body
        .vertices
        .get(edge.end)
        .ok_or(FilletError::InvalidBodyTopology)?;
    if (Vec3::from(end.point) - Vec3::from(start.point))
        .normalize()
        .is_none()
    {
        return Err(FilletError::DegenerateGeometry(edge_key));
    }
    for coedge in &edge.coedges {
        let coedge = body
            .coedges
            .get(*coedge)
            .ok_or(FilletError::InvalidBodyTopology)?;
        let ring = body
            .loops
            .get(coedge.owner)
            .ok_or(FilletError::InvalidBodyTopology)?;
        let face = body
            .faces
            .get(ring.owner)
            .ok_or(FilletError::InvalidBodyTopology)?;
        let Some(Surface::Plane(plane)) = body.surfaces.get(face.surface) else {
            return Err(FilletError::UnsupportedAdjacentSurface(edge_key));
        };
        if plane.normal().is_none() {
            return Err(FilletError::DegenerateGeometry(edge_key));
        }
    }
    Ok(())
}

fn corner_blends(
    body: &Body,
    selected: &[EdgeKey],
    radius: f64,
    tolerance: f64,
) -> Result<Vec<(Halfspace, Sphere)>, FilletError> {
    let mut owner = HashMap::<_, Vec<EdgeKey>>::new();
    for edge_key in selected {
        let edge = body.edges.get(*edge_key).ok_or(FilletError::UnknownEdge)?;
        for vertex in [edge.start, edge.end] {
            owner.entry(vertex).or_default().push(*edge_key);
        }
    }
    let mut vertices = owner.into_iter().collect::<Vec<_>>();
    vertices.sort_by_key(|(vertex, _)| vertex.slot());
    let mut corners = Vec::new();
    for (vertex, edges) in vertices {
        if edges.len() < 2 { continue; }
        let unsupported = FilletError::AdjacentSelections(edges[0], edges[1]);
        let incident = body.edges.iter().filter(|(_, edge)|
            edge.start == vertex || edge.end == vertex).count();
        if incident != 3 || edges.len() > 3 { return Err(unsupported); }
        let mut normals = Vec::<Vec3>::new();
        for edge in &edges {
            let frame = edge_frame(body, *edge).ok_or(unsupported)?;
            for normal in [frame.first_normal, frame.second_normal] {
                if normals.iter().all(|other| normal.dot(*other) < 1.0 - 1e-8) {
                    normals.push(normal);
                }
            }
        }
        if normals.len() != 3 || (0..3).any(|i|
            (i + 1..3).any(|j| normals[i].dot(normals[j]).abs() > 1e-8)) {
            return Err(unsupported);
        }
        if edges.len() == 3 {
            let point = Vec3::from(body.vertices.get(vertex)
                .ok_or(FilletError::InvalidBodyTopology)?.point);
            let sum = normals.iter().copied().fold(Vec3::ZERO, |a, b| a + b);
            let centre = point - sum * radius;
            let normal = sum.normalize().ok_or(unsupported)?;
            let origin = centre + normals[0] * radius;
            if normal.dot(point - origin) <= tolerance { return Err(unsupported); }
            // Keep both parameter poles and the longitude seam outside the
            // trimmed patch so downstream meshing has a regular UV domain.
            let pole = (normals[0] - normals[1]).normalize().ok_or(unsupported)?;
            let frame = Plane::orthonormal(centre.to_array(), normal.to_array(),
                pole.to_array()).ok_or(unsupported)?;
            corners.push((Halfspace { origin, normal, offset: normal.dot(origin), added: true },
                Sphere { frame, radius }));
        }
    }
    Ok(corners)
}

fn reject_interacting_regions(
    body: &Body,
    selected: &[EdgeKey],
    radius: f64,
    tolerance: f64,
) -> Result<(), FilletError> {
    let segments = selected
        .iter()
        .map(|edge_key| {
            let edge = body.edges.get(*edge_key).ok_or(FilletError::UnknownEdge)?;
            let start = body
                .vertices
                .get(edge.start)
                .ok_or(FilletError::InvalidBodyTopology)?;
            let end = body
                .vertices
                .get(edge.end)
                .ok_or(FilletError::InvalidBodyTopology)?;
            Ok((Vec3::from(start.point), Vec3::from(end.point)))
        })
        .collect::<Result<Vec<_>, FilletError>>()?;
    for first in 0..segments.len() {
        for second in first + 1..segments.len() {
            let a = body.edges.get(selected[first]).ok_or(FilletError::UnknownEdge)?;
            let b = body.edges.get(selected[second]).ok_or(FilletError::UnknownEdge)?;
            if [a.start, a.end].iter().any(|v| *v == b.start || *v == b.end) {
                continue;
            }
            if segment_distance(segments[first], segments[second])
                <= radius * 2.0 + tolerance
            {
                return Err(FilletError::RadiusTooLargeOrInteracting);
            }
        }
    }
    Ok(())
}

fn segment_distance(first: (Vec3, Vec3), second: (Vec3, Vec3)) -> f64 {
    let first_direction = first.1 - first.0;
    let second_direction = second.1 - second.0;
    let offset = first.0 - second.0;
    let first_length = first_direction.dot(first_direction);
    let second_length = second_direction.dot(second_direction);
    let cross = first_direction.dot(second_direction);
    let first_offset = first_direction.dot(offset);
    let second_offset = second_direction.dot(offset);
    let denominator = first_length * second_length - cross * cross;
    let mut first_parameter;
    let mut second_parameter;
    if denominator > f64::EPSILON * first_length.max(second_length).max(1.0) {
        first_parameter = (cross * second_offset - second_length * first_offset) / denominator;
        first_parameter = first_parameter.clamp(0.0, 1.0);
    } else {
        first_parameter = 0.0;
    }
    second_parameter = (cross * first_parameter + second_offset) / second_length;
    if second_parameter < 0.0 {
        second_parameter = 0.0;
        first_parameter = (-first_offset / first_length).clamp(0.0, 1.0);
    } else if second_parameter > 1.0 {
        second_parameter = 1.0;
        first_parameter = ((cross - first_offset) / first_length).clamp(0.0, 1.0);
    }
    (offset + first_direction * first_parameter - second_direction * second_parameter).length()
}

fn validate_supported_body(
    body: &Body,
    existing: &[ExistingFillet],
    tolerance: f64,
) -> Result<(), FilletError> {
    if body.roots.len() != 1 {
        return Err(FilletError::UnsupportedBodyTopology);
    }
    let lump = body
        .lumps
        .get(body.roots[0])
        .ok_or(FilletError::InvalidBodyTopology)?;
    if lump.shells.len() != 1 {
        return Err(FilletError::UnsupportedBodyTopology);
    }
    let shell = body
        .shells
        .get(lump.shells[0])
        .ok_or(FilletError::InvalidBodyTopology)?;
    if shell.faces.len() != body.faces.len()
        || body.faces.iter().any(|(_, face)| face.loops.len() != 1)
    {
        return Err(FilletError::UnsupportedBodyTopology);
    }
    let cylinders = body
        .faces
        .iter()
        .filter(|(_, face)| {
            matches!(body.surfaces.get(face.surface), Some(Surface::Cylinder(_)))
        })
        .count();
    if cylinders != existing.len() {
        return Err(FilletError::UnsupportedExistingFillet);
    }
    if body.faces.iter().any(|(_, face)| {
        !matches!(
            body.surfaces.get(face.surface),
            Some(Surface::Plane(_) | Surface::Cylinder(_) | Surface::Sphere(_))
        )
    }) {
        return Err(FilletError::UnsupportedBodySurface);
    }

    for (_, face) in body.faces.iter() {
        let Some(Surface::Plane(plane)) = body.surfaces.get(face.surface) else {
            continue;
        };
        let Some(normal) = plane.normal().map(Vec3::from) else {
            return Err(FilletError::UnsupportedBodySurface);
        };
        let normal = if face.forward { normal } else { -normal };
        let offset = normal.dot(Vec3::from(plane.origin));
        if body.vertices.iter().any(|(_, vertex)| {
            normal.dot(Vec3::from(vertex.point)) > offset + tolerance
        }) {
            return Err(FilletError::NonConvexBody);
        }
    }
    Ok(())
}

fn existing_fillets(body: &Body) -> Option<Vec<ExistingFillet>> {
    let mut found = Vec::new();
    for (face_key, face) in body.faces.iter() {
        let Surface::Cylinder(cylinder) = body.surfaces.get(face.surface)? else {
            continue;
        };
        let axis = Vec3::from(cylinder.base.normal()?);
        let mut side_normals = Vec::new();
        let mut points = Vec::new();
        let mut line_edges = 0usize;
        for coedge_key in body.face_coedges(face_key) {
            let coedge = body.coedges.get(coedge_key)?;
            let edge = body.edges.get(coedge.edge)?;
            points.push(Vec3::from(body.vertices.get(edge.start)?.point));
            if !matches!(body.curves.get(edge.curve)?, Curve3::Line(_)) {
                continue;
            }
            line_edges += 1;
            let other_face = edge.coedges.iter().find_map(|candidate| {
                let candidate = body.coedges.get(*candidate)?;
                let owner = body.loops.get(candidate.owner)?.owner;
                (owner != face_key).then_some(owner)
            })?;
            let other = body.faces.get(other_face)?;
            let Surface::Plane(plane) = body.surfaces.get(other.surface)? else {
                return None;
            };
            let mut normal = Vec3::from(plane.normal()?);
            if !other.forward {
                normal = -normal;
            }
            if normal.dot(axis).abs() <= 1e-8 {
                side_normals.push(normal);
            }
        }
        if line_edges != 2 || side_normals.len() != 2 || points.is_empty() {
            continue;
        }
        let normal = (side_normals[0] + side_normals[1]).normalize()?;
        let offset = points.iter().map(|point| normal.dot(*point)).sum::<f64>()
            / points.len() as f64;
        found.push(ExistingFillet {
            cut: Halfspace {
                origin: points[0],
                normal,
                offset,
                added: true,
            },
            cylinder: cylinder.clone(),
            forward: face.forward,
        });
    }
    Some(found)
}

fn restore_fillets(
    body: &mut Body,
    fillets: &[ExistingFillet],
    corners: &[(Halfspace, Sphere)],
    tolerance: f64,
) -> Option<()> {
    let faces = fillets.iter().map(|fillet| face_on(body, fillet.cut, tolerance))
        .collect::<Option<Vec<_>>>()?;
    for (cut, sphere) in corners {
        let face = face_on(body, *cut, tolerance)?;
        let surface = body.faces.get(face)?.surface;
        *body.surfaces.get_mut(surface)? = Surface::Sphere(*sphere);
    }
    for (fillet, face) in fillets.iter().zip(&faces) {
        let surface = body.faces.get(*face)?.surface;
        *body.surfaces.get_mut(surface)? = Surface::Cylinder(fillet.cylinder);
    }
    for (fillet, face) in fillets.iter().zip(faces) {
        if round_face(body, face, &fillet.cylinder, fillet.forward, tolerance)? != 2 {
            return None;
        }
    }
    Some(())
}

fn face_on(body: &Body, halfspace: Halfspace, tolerance: f64) -> Option<FaceKey> {
    body.faces.iter().find_map(|(key, face)| {
        let Surface::Plane(plane) = body.surfaces.get(face.surface)? else {
            return None;
        };
        let mut normal = Vec3::from(plane.normal()?);
        if !face.forward {
            normal = -normal;
        }
        (normal.dot(halfspace.normal) > 1.0 - 1e-8
            && (normal.dot(Vec3::from(plane.origin)) - halfspace.offset).abs() <= tolerance)
            .then_some(key)
    })
}

fn validate_chamfer_edge(body: &Body, edge_key: EdgeKey) -> Result<(), ChamferError> {
    let edge = body.edges.get(edge_key).ok_or(ChamferError::UnknownEdge)?;
    if !matches!(body.curves.get(edge.curve), Some(Curve3::Line(_))) {
        return Err(ChamferError::UnsupportedEdgeCurve(edge_key));
    }
    if edge.coedges.len() != 2 {
        return Err(ChamferError::NonManifoldEdge(edge_key));
    }
    let start = body
        .vertices
        .get(edge.start)
        .ok_or(ChamferError::InvalidBodyTopology)?;
    let end = body
        .vertices
        .get(edge.end)
        .ok_or(ChamferError::InvalidBodyTopology)?;
    if (Vec3::from(end.point) - Vec3::from(start.point))
        .normalize()
        .is_none()
    {
        return Err(ChamferError::DegenerateGeometry(edge_key));
    }
    for coedge in &edge.coedges {
        let coedge = body
            .coedges
            .get(*coedge)
            .ok_or(ChamferError::InvalidBodyTopology)?;
        let ring = body
            .loops
            .get(coedge.owner)
            .ok_or(ChamferError::InvalidBodyTopology)?;
        let face = body
            .faces
            .get(ring.owner)
            .ok_or(ChamferError::InvalidBodyTopology)?;
        let Some(Surface::Plane(plane)) = body.surfaces.get(face.surface) else {
            return Err(ChamferError::UnsupportedAdjacentSurface(edge_key));
        };
        if plane.normal().is_none() {
            return Err(ChamferError::DegenerateGeometry(edge_key));
        }
    }
    Ok(())
}

fn validate_chamfer_body(
    body: &Body,
    existing: &[ExistingFillet],
    tolerance: f64,
) -> Result<(), ChamferError> {
    validate_supported_body(body, existing, tolerance).map_err(|error| match error {
        FilletError::InvalidBodyTopology => ChamferError::InvalidBodyTopology,
        FilletError::UnsupportedBodyTopology => ChamferError::UnsupportedBodyTopology,
        FilletError::UnsupportedBodySurface => ChamferError::UnsupportedBodySurface,
        FilletError::NonConvexBody => ChamferError::NonConvexBody,
        FilletError::UnsupportedExistingFillet => ChamferError::UnsupportedExistingFillet,
        _ => ChamferError::InvalidBodyTopology,
    })
}

fn faces_touch(body: &Body, first: FaceKey, second: FaceKey) -> bool {
    let vertices = |face| {
        body.face_coedges(face)
            .into_iter()
            .filter_map(|coedge| body.coedges.get(coedge))
            .filter_map(|coedge| body.edges.get(coedge.edge))
            .flat_map(|edge| [edge.start, edge.end])
            .collect::<HashSet<_>>()
    };
    let first = vertices(first);
    vertices(second).iter().any(|vertex| first.contains(vertex))
}

fn round_face(
    body: &mut Body,
    face: FaceKey,
    cylinder: &Cylinder,
    forward: bool,
    tolerance: f64,
) -> Option<usize> {
    let axis = Vec3::from(cylinder.base.normal()?);
    let centre = Vec3::from(cylinder.base.origin);
    let surface = body.faces.get(face)?.surface;
    *body.surfaces.get_mut(surface)? = Surface::Cylinder(cylinder.clone());
    body.faces.get_mut(face)?.forward = forward;
    let loop_key = *body.faces.get(face)?.loops.first()?;
    let edges = body
        .loops
        .get(loop_key)?
        .coedges
        .iter()
        .filter_map(|coedge| body.coedges.get(*coedge).map(|coedge| coedge.edge))
        .collect::<Vec<_>>();
    let mut rounded = 0usize;
    for edge_key in edges {
        let edge = body.edges.get(edge_key)?.clone();
        let start = Vec3::from(body.vertices.get(edge.start)?.point);
        let end = Vec3::from(body.vertices.get(edge.end)?.point);
        if (end - start).normalize()?.dot(axis).abs() > 1.0 - 1e-8 {
            continue;
        }
        let other_face = edge.coedges.iter().find_map(|key| {
            let owner = body.loops.get(body.coedges.get(*key)?.owner)?.owner;
            (owner != face).then_some(owner)
        })?;
        let other = body.faces.get(other_face)?;
        if let Surface::Cylinder(other_cylinder) = body.surfaces.get(other.surface)? {
            let curve = cylinder_seam(cylinder, other_cylinder, start, end, tolerance)?;
            set_round_edge(body, edge_key, curve, tolerance)?;
            rounded += 1;
            continue;
        }
        let start_height = (start - centre).dot(axis);
        let end_height = (end - centre).dot(axis);
        if (start_height - end_height).abs() > tolerance {
            return None;
        }
        let cross_centre = centre + axis * ((start_height + end_height) * 0.5);
        let mut circle_plane = Plane::orthonormal(
            cross_centre.to_array(),
            cylinder.base.x_axis,
            axis.to_array(),
        )?;
        let mut parameters = circle_parameters(&circle_plane, start, end)?;
        if parameters.1 - parameters.0 > PI + 1e-9 {
            circle_plane = Plane::orthonormal(
                cross_centre.to_array(),
                cylinder.base.x_axis,
                (-axis).to_array(),
            )?;
            parameters = circle_parameters(&circle_plane, start, end)?;
        }
        *body.curves.get_mut(edge.curve)? = Curve3::Circle(Circle3 {
            plane: circle_plane,
            radius: cylinder.radius,
        });
        let edge = body.edges.get_mut(edge_key)?;
        edge.start_parameter = parameters.0;
        edge.end_parameter = parameters.1;
        rounded += 1;
    }
    Some(rounded)
}

/// Equal-radius cylinders at a corner intersect in two planar ellipses.
/// Select the bisector containing the proxy endpoints, then retain the short
/// arc; this is an exact intersection, not a sampled approximation.
fn cylinder_seam(
    first: &Cylinder,
    second: &Cylinder,
    start: Vec3,
    end: Vec3,
    tolerance: f64,
) -> Option<Curve3> {
    if (first.radius - second.radius).abs() > tolerance { return None; }
    let a = Vec3::from(first.base.normal()?);
    let b = Vec3::from(second.base.normal()?);
    let cosine = a.dot(b);
    if cosine.abs() > 1.0 - 1e-8 { return None; }
    let delta = Vec3::from(second.base.origin) - Vec3::from(first.base.origin);
    let along = (a.dot(delta) - cosine * b.dot(delta)) / (1.0 - cosine * cosine);
    let centre = Vec3::from(first.base.origin) + a * along;
    let second_delta = centre - Vec3::from(second.base.origin);
    if (second_delta - b * second_delta.dot(b)).length() > tolerance { return None; }
    for bisector in [a + b, a - b] {
        let normal = bisector.normalize()?;
        if normal.dot(start - centre).abs() > tolerance
            || normal.dot(end - centre).abs() > tolerance { continue; }
        let cosine = normal.dot(a).abs();
        if cosine < 1e-8 { continue; }
        let major = (a - normal * normal.dot(a)).normalize()?;
        let plane = Plane::orthonormal(centre.to_array(), major.to_array(), normal.to_array())?;
        return Some(Curve3::Ellipse(Ellipse3 {
            plane, major_radius: first.radius / cosine, minor_radius: first.radius,
        }));
    }
    None
}

fn set_round_edge(body: &mut Body, key: EdgeKey, mut curve: Curve3, tolerance: f64) -> Option<()> {
    let edge = body.edges.get(key)?.clone();
    let start = body.vertices.get(edge.start)?.point;
    let end = body.vertices.get(edge.end)?.point;
    let mut begin = curve.parameter_at(start);
    let mut span = (curve.parameter_at(end) - begin).rem_euclid(TAU);
    if span > PI {
        let plane = match &mut curve {
            Curve3::Ellipse(ellipse) => &mut ellipse.plane,
            Curve3::Circle(circle) => &mut circle.plane,
            _ => return None,
        };
        plane.y_axis = (-Vec3::from(plane.y_axis)).to_array();
        begin = curve.parameter_at(start);
        span = (curve.parameter_at(end) - begin).rem_euclid(TAU);
    }
    if span <= 1e-12 || span > PI + 1e-8
        || Vec3::from(curve.point_at(begin)).distance(Vec3::from(start)) > tolerance
        || Vec3::from(curve.point_at(begin + span)).distance(Vec3::from(end)) > tolerance {
        return None;
    }
    *body.curves.get_mut(edge.curve)? = curve;
    let edge = body.edges.get_mut(key)?;
    edge.start_parameter = begin;
    edge.end_parameter = begin + span;
    Some(())
}

fn existing_corners(body: &Body) -> Option<Vec<(Halfspace, Sphere)>> {
    let tolerance = operation_tolerance(&[body]);
    let mut corners = Vec::new();
    for (key, face) in body.faces.iter() {
        let Surface::Sphere(sphere) = body.surfaces.get(face.surface)? else { continue; };
        if !face.forward || face.loops.len() != 1 { return None; }
        let centre = Vec3::from(sphere.frame.origin);
        let mut points = Vec::new();
        for coedge in body.face_coedges(key) {
            let edge = body.edges.get(body.coedges.get(coedge)?.edge)?;
            for vertex in [edge.start, edge.end] {
                let point = Vec3::from(body.vertices.get(vertex)?.point);
                if points.iter().all(|other: &Vec3| other.distance(point) > tolerance) {
                    points.push(point);
                }
            }
            let other = edge.coedges.iter().find_map(|coedge| {
                let owner = body.loops.get(body.coedges.get(*coedge)?.owner)?.owner;
                (owner != key).then_some(owner)
            })?;
            let Surface::Cylinder(cylinder) = body.surfaces.get(body.faces.get(other)?.surface)? else { return None; };
            let axis = Vec3::from(cylinder.base.normal()?);
            let offset = centre - Vec3::from(cylinder.base.origin);
            if (cylinder.radius - sphere.radius).abs() > tolerance
                || (offset - axis * offset.dot(axis)).length() > tolerance { return None; }
        }
        if points.len() != 3 { return None; }
        let normal = points.iter().fold(Vec3::ZERO, |sum, point| sum + (*point - centre)).normalize()?;
        let origin = points[0];
        if points.iter().any(|point| normal.dot(*point - origin).abs() > tolerance
            || (point.distance(centre) - sphere.radius).abs() > tolerance) { return None; }
        corners.push((Halfspace { origin, normal, offset: normal.dot(origin), added: true }, *sphere));
    }
    Some(corners)
}

fn blend_boundaries_fit(body: &Body, tolerance: f64) -> bool {
    body.edges.iter().all(|(_, edge)| {
        let Some(curve) = body.curves.get(edge.curve) else { return false; };
        edge.coedges.iter().all(|key| {
            let Some(coedge) = body.coedges.get(*key) else { return false; };
            let Some(ring) = body.loops.get(coedge.owner) else { return false; };
            let Some(face) = body.faces.get(ring.owner) else { return false; };
            let Some(surface) = body.surfaces.get(face.surface) else { return false; };
            (0..=8).all(|i| {
                let t = edge.start_parameter
                    + (edge.end_parameter - edge.start_parameter) * i as f64 / 8.0;
                let distance = surface.distance_to(curve.point_at(t));
                distance.is_finite() && distance.abs() <= tolerance
            })
        })
    })
}

fn convex_body(halfspaces: &[Halfspace], tolerance: f64) -> Option<(Body, FaceKey)> {
    let mut points = Vec::<Vec3>::new();
    for first in 0..halfspaces.len() {
        for second in first + 1..halfspaces.len() {
            for third in second + 1..halfspaces.len() {
                let Some(point) = intersection(
                    halfspaces[first],
                    halfspaces[second],
                    halfspaces[third],
                ) else {
                    continue;
                };
                if halfspaces
                    .iter()
                    .any(|plane| plane.normal.dot(point) > plane.offset + tolerance)
                {
                    continue;
                }
                if points
                    .iter()
                    .all(|other| other.distance(point) > tolerance)
                {
                    points.push(point);
                }
            }
        }
    }
    if points.len() < 4 {
        return None;
    }

    let mut body = Body::new();
    let lump = body.lumps.insert(Lump {
        shells: Vec::new(),
        provenance: Provenance::Synthesized,
    });
    let shell = body.shells.insert(Shell {
        faces: Vec::new(),
        owner: lump,
        provenance: Provenance::Synthesized,
    });
    let vertices = points
        .iter()
        .map(|point| {
            body.vertices.insert(Vertex {
                point: point.to_array(),
                provenance: Provenance::Synthesized,
            })
        })
        .collect::<Vec<_>>();
    let mut edge_map = HashMap::<(usize, usize), EdgeKey>::new();
    let mut added_face = None;
    for halfspace in halfspaces {
        let mut indices = points
            .iter()
            .enumerate()
            .filter_map(|(index, point)| {
                ((halfspace.normal.dot(*point) - halfspace.offset).abs() <= tolerance)
                    .then_some(index)
            })
            .collect::<Vec<_>>();
        if indices.len() < 3 {
            continue;
        }
        let centre = indices
            .iter()
            .fold(Vec3::ZERO, |sum, index| sum + points[*index])
            / indices.len() as f64;
        let seed = if halfspace.normal.x.abs() < 0.8 {
            Vec3::new(1.0, 0.0, 0.0)
        } else {
            Vec3::new(0.0, 1.0, 0.0)
        };
        let x = halfspace.normal.cross(seed).normalize()?;
        let y = halfspace.normal.cross(x);
        indices.sort_by(|a, b| {
            let angle = |index: usize| {
                let delta = points[index] - centre;
                delta.dot(y).atan2(delta.dot(x))
            };
            angle(*a).total_cmp(&angle(*b))
        });
        remove_collinear(&mut indices, &points, tolerance);
        if indices.len() < 3 {
            continue;
        }
        let plane = Plane::orthonormal(
            halfspace.origin.to_array(),
            x.to_array(),
            halfspace.normal.to_array(),
        )?;
        let surface = body.surfaces.insert(Surface::Plane(plane));
        let face = body.faces.insert(Face {
            surface,
            forward: true,
            loops: Vec::new(),
            owner: shell,
            provenance: Provenance::Synthesized,
        });
        let ring = body.loops.insert(Loop {
            coedges: Vec::new(),
            owner: face,
            provenance: Provenance::Synthesized,
        });
        let mut coedges = Vec::with_capacity(indices.len());
        for position in 0..indices.len() {
            let from = indices[position];
            let to = indices[(position + 1) % indices.len()];
            let key = (from.min(to), from.max(to));
            let edge = if let Some(edge) = edge_map.get(&key).copied() {
                edge
            } else {
                let direction = points[key.1] - points[key.0];
                let curve = body.curves.insert(Curve3::Line(Line3 {
                    origin: points[key.0].to_array(),
                    direction: direction.to_array(),
                }));
                let edge = body.edges.insert(Edge {
                    curve,
                    start_parameter: 0.0,
                    end_parameter: 1.0,
                    start: vertices[key.0],
                    end: vertices[key.1],
                    coedges: Vec::new(),
                    provenance: Provenance::Synthesized,
                });
                edge_map.insert(key, edge);
                edge
            };
            let coedge = body.coedges.insert(Coedge {
                edge,
                forward: from == key.0,
                pcurve: None,
                owner: ring,
                provenance: Provenance::Synthesized,
            });
            body.edges.get_mut(edge)?.coedges.push(coedge);
            coedges.push(coedge);
        }
        body.loops.get_mut(ring)?.coedges = coedges;
        body.faces.get_mut(face)?.loops = vec![ring];
        body.shells.get_mut(shell)?.faces.push(face);
        if halfspace.added {
            added_face = Some(face);
        }
    }
    body.lumps.get_mut(lump)?.shells = vec![shell];
    body.roots = vec![lump];
    let added_face = added_face?;
    body.validate().is_empty().then_some((body, added_face))
}

fn intersection(first: Halfspace, second: Halfspace, third: Halfspace) -> Option<Vec3> {
    let denominator = first.normal.dot(second.normal.cross(third.normal));
    if denominator.abs() <= 1e-12 {
        return None;
    }
    Some(
        (second.normal.cross(third.normal) * first.offset
            + third.normal.cross(first.normal) * second.offset
            + first.normal.cross(second.normal) * third.offset)
            / denominator,
    )
}

fn remove_collinear(indices: &mut Vec<usize>, points: &[Vec3], tolerance: f64) {
    loop {
        let count = indices.len();
        let remove = (0..count).find(|index| {
            let before = points[indices[(index + count - 1) % count]];
            let here = points[indices[*index]];
            let after = points[indices[(index + 1) % count]];
            let first = here - before;
            let second = after - here;
            first.cross(second).length() <= tolerance * first.length().max(second.length())
        });
        let Some(index) = remove else {
            break;
        };
        indices.remove(index);
        if indices.len() < 3 {
            break;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::brep::make::cuboid;

    fn opposite_edges_on_one_face(body: &Body) -> (FaceKey, [EdgeKey; 2]) {
        let face = body.face_keys().next().unwrap();
        let edges = body
            .face_coedges(face)
            .into_iter()
            .map(|coedge| body.coedges.get(coedge).unwrap().edge)
            .collect::<Vec<_>>();
        (face, [edges[0], edges[2]])
    }

    #[test]
    fn opposite_box_edges_are_filleted_atomically() {
        let body = cuboid([0.0; 3], [8.0, 6.0, 4.0]).unwrap();
        let (_, edges) = opposite_edges_on_one_face(&body);
        let result = fillet_edges(&body, &edges, 0.5).unwrap();

        assert!(result.validate().is_empty());
        assert!(result.faces.len() > body.faces.len());
    }

    #[test]
    fn opposite_box_edges_are_chamfered_atomically() {
        let body = cuboid([0.0; 3], [8.0, 6.0, 4.0]).unwrap();
        let (face, edges) = opposite_edges_on_one_face(&body);
        let result = chamfer_edges(&body, &edges, face, 0.5, 0.75).unwrap();

        assert!(result.validate().is_empty());
        assert!(result.faces.len() > body.faces.len());
    }
}
