//! Hollowing exact analytic solids.
//!
//! A shell is the material between an exterior and an offset cavity.  A
//! removed face opens that cavity through the corresponding side instead of
//! leaving a cap.  Construction stays in the kernel so every application and
//! file-format consumer receives the same topology and refusal rules.

use super::{Body, FaceKey, Operation, Placement, Snag, Surface};
use crate::space::Vec3;
use std::collections::{HashMap, HashSet};

/// Why a solid could not be hollowed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ShellError {
    InvalidDistance,
    UnsupportedSolid,
    UnknownFace,
    NoMaterial,
    Kernel(Snag),
}

impl From<Snag> for ShellError {
    fn from(value: Snag) -> Self {
        Self::Kernel(value)
    }
}

#[derive(Clone, Copy)]
struct BoxFace {
    axis: usize,
    maximum: bool,
}

struct BoxShape {
    origin: [f64; 3],
    axes: [[f64; 3]; 3],
    size: [f64; 3],
    faces: HashMap<FaceKey, BoxFace>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum CylinderFace {
    Side,
    Bottom,
    Top,
}

struct CylinderShape {
    origin: [f64; 3],
    axes: [[f64; 3]; 3],
    radius: f64,
    height: f64,
    faces: HashMap<FaceKey, CylinderFace>,
}

struct SphereShape {
    centre: [f64; 3],
    radius: f64,
    face: FaceKey,
}

/// Hollow `body` by `distance`, opening the cavity through `removed_faces`.
///
/// Positive distances keep the exterior fixed and offset the cavity inward.
/// Negative distances keep the original body as the cavity and grow a new
/// exterior.  Exact rectangular boxes, circular cylinders and spheres are
/// supported; other surface sets are refused without changing the input.
pub fn shell(
    body: &Body,
    removed_faces: &[FaceKey],
    distance: f64,
) -> Result<Body, ShellError> {
    if !distance.is_finite() || distance == 0.0 {
        return Err(ShellError::InvalidDistance);
    }
    let removed = removed_faces.iter().copied().collect::<HashSet<_>>();
    if removed.len() != removed_faces.len()
        || removed.iter().any(|face| !body.faces.contains(*face))
    {
        return Err(ShellError::UnknownFace);
    }
    if body.roots.len() != 1 || body.lumps.len() != 1 || body.shells.len() != 1 {
        return Err(ShellError::UnsupportedSolid);
    }

    let result = if let Some(shape) = recognize_box(body) {
        shell_box(body, &shape, &removed, distance)?
    } else if let Some(shape) = recognize_cylinder(body) {
        shell_cylinder(body, &shape, &removed, distance)?
    } else if let Some(shape) = recognize_sphere(body) {
        shell_sphere(body, &shape, &removed, distance)?
    } else {
        return Err(ShellError::UnsupportedSolid);
    };
    if result.face_keys().next().is_none() || result.roots.is_empty() {
        return Err(ShellError::NoMaterial);
    }
    Ok(result)
}

/// Resolve a surface pick to a face supported by [`shell`].
pub fn shell_face_at_point(body: &Body, point: [f64; 3]) -> Option<FaceKey> {
    if point.iter().any(|value| !value.is_finite())
        || (recognize_box(body).is_none()
            && recognize_cylinder(body).is_none()
            && recognize_sphere(body).is_none())
    {
        return None;
    }
    body.face_keys()
        .filter_map(|key| {
            let face = body.faces.get(key)?;
            let surface = body.surfaces.get(face.surface)?;
            Some((key, surface.distance_to(point).abs()))
        })
        .min_by(|left, right| left.1.total_cmp(&right.1))
        .map(|(key, _)| key)
}

fn shell_box(
    body: &Body,
    shape: &BoxShape,
    removed: &HashSet<FaceKey>,
    distance: f64,
) -> Result<Body, ShellError> {
    let mut open = [[false; 2]; 3];
    for face in removed {
        let Some(tag) = shape.faces.get(face) else {
            return Err(ShellError::UnknownFace);
        };
        open[tag.axis][usize::from(tag.maximum)] = true;
    }
    if removed.len() == shape.faces.len() {
        return Err(ShellError::NoMaterial);
    }
    let thickness = distance.abs();
    let span = shape.size.iter().copied().fold(0.0, f64::max);
    let extension = span + thickness * 2.0;

    let (outer_min, outer_size, cavity_min, cavity_size) = if distance > 0.0 {
        let mut cavity_min = [0.0; 3];
        let mut cavity_max = [0.0; 3];
        for axis in 0..3 {
            cavity_min[axis] = if open[axis][0] { -extension } else { thickness };
            cavity_max[axis] = if open[axis][1] {
                shape.size[axis] + extension
            } else {
                shape.size[axis] - thickness
            };
            if cavity_max[axis] <= cavity_min[axis] {
                return Err(ShellError::NoMaterial);
            }
        }
        (
            [0.0; 3],
            shape.size,
            cavity_min,
            std::array::from_fn(|axis| cavity_max[axis] - cavity_min[axis]),
        )
    } else {
        let outer_min = [-thickness; 3];
        let outer_size = std::array::from_fn(|axis| shape.size[axis] + 2.0 * thickness);
        let mut cavity_min = [0.0; 3];
        let mut cavity_max = shape.size;
        for axis in 0..3 {
            if open[axis][0] {
                cavity_min[axis] = -extension;
            }
            if open[axis][1] {
                cavity_max[axis] = shape.size[axis] + extension;
            }
        }
        (
            outer_min,
            outer_size,
            cavity_min,
            std::array::from_fn(|axis| cavity_max[axis] - cavity_min[axis]),
        )
    };

    let outer = placed_box(shape, outer_min, outer_size)?;
    let cavity = placed_box(shape, cavity_min, cavity_size)?;
    subtract(outer, cavity, body)
}

fn placed_box(shape: &BoxShape, local_origin: [f64; 3], size: [f64; 3]) -> Result<Body, ShellError> {
    let local = super::make::cuboid(local_origin, size).ok_or(ShellError::NoMaterial)?;
    super::place::transform(
        &local,
        &Placement {
            x_axis: shape.axes[0],
            y_axis: shape.axes[1],
            z_axis: shape.axes[2],
            origin: shape.origin,
        },
    )
    .ok_or(ShellError::UnsupportedSolid)
}

fn shell_cylinder(
    body: &Body,
    shape: &CylinderShape,
    removed: &HashSet<FaceKey>,
    distance: f64,
) -> Result<Body, ShellError> {
    let mut side_open = false;
    let mut bottom_open = false;
    let mut top_open = false;
    for face in removed {
        match shape.faces.get(face).copied().ok_or(ShellError::UnknownFace)? {
            CylinderFace::Side => side_open = true,
            CylinderFace::Bottom => bottom_open = true,
            CylinderFace::Top => top_open = true,
        }
    }
    if side_open && bottom_open && top_open {
        return Err(ShellError::NoMaterial);
    }
    let thickness = distance.abs();
    let extension = shape.radius.max(shape.height) + thickness * 2.0;
    let (outer_radius, outer_z, outer_height, cavity_radius, cavity_z, cavity_height) =
        if distance > 0.0 {
            let cavity_radius = if side_open {
                shape.radius + extension
            } else {
                shape.radius - thickness
            };
            let cavity_z = if bottom_open { -extension } else { thickness };
            let cavity_top = if top_open {
                shape.height + extension
            } else {
                shape.height - thickness
            };
            (
                shape.radius,
                0.0,
                shape.height,
                cavity_radius,
                cavity_z,
                cavity_top - cavity_z,
            )
        } else {
            let cavity_radius = if side_open {
                shape.radius + thickness + extension
            } else {
                shape.radius
            };
            let cavity_z = if bottom_open { -extension } else { 0.0 };
            let cavity_top = if top_open {
                shape.height + extension
            } else {
                shape.height
            };
            (
                shape.radius + thickness,
                -thickness,
                shape.height + 2.0 * thickness,
                cavity_radius,
                cavity_z,
                cavity_top - cavity_z,
            )
        };
    if outer_radius <= 0.0
        || outer_height <= 0.0
        || cavity_radius <= 0.0
        || cavity_height <= 0.0
    {
        return Err(ShellError::NoMaterial);
    }
    let outer = placed_cylinder(shape, outer_radius, outer_z, outer_height)?;
    let cavity = placed_cylinder(shape, cavity_radius, cavity_z, cavity_height)?;
    subtract(outer, cavity, body)
}

fn placed_cylinder(
    shape: &CylinderShape,
    radius: f64,
    local_z: f64,
    height: f64,
) -> Result<Body, ShellError> {
    let local = super::make::cylinder([0.0, 0.0, local_z], radius, height)
        .ok_or(ShellError::NoMaterial)?;
    super::place::transform(
        &local,
        &Placement {
            x_axis: shape.axes[0],
            y_axis: shape.axes[1],
            z_axis: shape.axes[2],
            origin: shape.origin,
        },
    )
    .ok_or(ShellError::UnsupportedSolid)
}

fn shell_sphere(
    body: &Body,
    shape: &SphereShape,
    removed: &HashSet<FaceKey>,
    distance: f64,
) -> Result<Body, ShellError> {
    if !removed.is_empty() {
        return if removed.contains(&shape.face) {
            Err(ShellError::NoMaterial)
        } else {
            Err(ShellError::UnknownFace)
        };
    }
    let thickness = distance.abs();
    let (outer_radius, cavity_radius) = if distance > 0.0 {
        (shape.radius, shape.radius - thickness)
    } else {
        (shape.radius + thickness, shape.radius)
    };
    if outer_radius <= 0.0 || cavity_radius <= 0.0 {
        return Err(ShellError::NoMaterial);
    }
    let outer = super::make::sphere(shape.centre, outer_radius).ok_or(ShellError::NoMaterial)?;
    let cavity = super::make::sphere(shape.centre, cavity_radius).ok_or(ShellError::NoMaterial)?;
    subtract(outer, cavity, body)
}

fn subtract(outer: Body, cavity: Body, reference: &Body) -> Result<Body, ShellError> {
    let tolerance = super::operation_tolerance(&[reference, &outer, &cavity]);
    super::combine(outer, cavity, Operation::Difference, tolerance).map_err(ShellError::Kernel)
}

fn recognize_box(body: &Body) -> Option<BoxShape> {
    if body.faces.len() != 6 || body.edges.len() != 12 || body.vertices.len() != 8 {
        return None;
    }
    if body.face_keys().any(|key| {
        body.faces
            .get(key)
            .and_then(|face| body.surfaces.get(face.surface))
            .is_none_or(|surface| !matches!(surface, Surface::Plane(_)))
    }) {
        return None;
    }
    let (corner_key, corner) = body.vertices.iter().next()?;
    let origin = corner.point;
    let mut spans = Vec::new();
    for (_, edge) in body.edges.iter() {
        let other = if edge.start == corner_key {
            Some(edge.end)
        } else if edge.end == corner_key {
            Some(edge.start)
        } else {
            None
        };
        let Some(other) = other else { continue };
        let delta = Vec3::from(body.vertices.get(other)?.point) - Vec3::from(origin);
        spans.push((delta.normalize()?.to_array(), delta.length()));
    }
    if spans.len() != 3 {
        return None;
    }
    let axes = [spans[0].0, spans[1].0, spans[2].0];
    let size = [spans[0].1, spans[1].1, spans[2].1];
    let scale = size.iter().copied().fold(1.0, f64::max);
    let tolerance = scale * 1e-8;
    for one in 0..3 {
        for other in one + 1..3 {
            if Vec3::from(axes[one]).dot(Vec3::from(axes[other])).abs() > 1e-8 {
                return None;
            }
        }
    }
    for (_, vertex) in body.vertices.iter() {
        let offset = Vec3::from(vertex.point) - Vec3::from(origin);
        for axis in 0..3 {
            let coordinate = offset.dot(Vec3::from(axes[axis]));
            if coordinate.abs() > tolerance && (coordinate - size[axis]).abs() > tolerance {
                return None;
            }
        }
    }
    let mut faces = HashMap::new();
    for key in body.face_keys() {
        let face = body.faces.get(key)?;
        let Surface::Plane(plane) = body.surfaces.get(face.surface)? else {
            return None;
        };
        let mut normal = Vec3::from(plane.normal()?);
        if !face.forward {
            normal = -normal;
        }
        let (axis, projection) = (0..3)
            .map(|axis| (axis, normal.dot(Vec3::from(axes[axis]))))
            .max_by(|a, b| a.1.abs().total_cmp(&b.1.abs()))?;
        if projection.abs() < 1.0 - 1e-8 {
            return None;
        }
        faces.insert(key, BoxFace { axis, maximum: projection > 0.0 });
    }
    (faces.len() == 6).then_some(BoxShape { origin, axes, size, faces })
}

fn recognize_cylinder(body: &Body) -> Option<CylinderShape> {
    if body.faces.len() != 3 {
        return None;
    }
    let mut cylinder = None;
    let mut caps = Vec::new();
    for key in body.face_keys() {
        let face = body.faces.get(key)?;
        match body.surfaces.get(face.surface)? {
            Surface::Cylinder(surface) if cylinder.is_none() => cylinder = Some((key, *surface)),
            Surface::Plane(plane) => caps.push((key, *plane)),
            _ => return None,
        }
    }
    let (side, cylinder) = cylinder?;
    if caps.len() != 2 || !cylinder.radius.is_finite() || cylinder.radius <= 0.0 {
        return None;
    }
    let axis = Vec3::from(cylinder.base.normal()?).normalize()?;
    let x = Vec3::from(cylinder.base.x_axis).normalize()?;
    let x = (x - axis * x.dot(axis)).normalize()?;
    let y = axis.cross(x).normalize()?;
    let mut cap_positions = caps
        .iter()
        .map(|(key, plane)| {
            let normal = Vec3::from(plane.normal()?);
            if normal.dot(axis).abs() < 1.0 - 1e-8 {
                return None;
            }
            Some((*key, (Vec3::from(plane.origin) - Vec3::from(cylinder.base.origin)).dot(axis)))
        })
        .collect::<Option<Vec<_>>>()?;
    cap_positions.sort_by(|a, b| a.1.total_cmp(&b.1));
    let height = cap_positions[1].1 - cap_positions[0].1;
    if !height.is_finite() || height <= 0.0 {
        return None;
    }
    let origin = (Vec3::from(cylinder.base.origin) + axis * cap_positions[0].1).to_array();
    let faces = HashMap::from([
        (side, CylinderFace::Side),
        (cap_positions[0].0, CylinderFace::Bottom),
        (cap_positions[1].0, CylinderFace::Top),
    ]);
    Some(CylinderShape {
        origin,
        axes: [x.to_array(), y.to_array(), axis.to_array()],
        radius: cylinder.radius,
        height,
        faces,
    })
}

fn recognize_sphere(body: &Body) -> Option<SphereShape> {
    if body.faces.len() != 1 {
        return None;
    }
    let face = body.face_keys().next()?;
    let node = body.faces.get(face)?;
    let Surface::Sphere(sphere) = body.surfaces.get(node.surface)? else {
        return None;
    };
    (sphere.radius.is_finite() && sphere.radius > 0.0).then_some(SphereShape {
        centre: sphere.frame.origin,
        radius: sphere.radius,
        face,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::brep::{analytic_mass_properties, make};
    use std::f64::consts::PI;

    #[test]
    fn a_sphere_shell_has_the_exact_annular_volume() {
        let solid = make::sphere([3.0, -2.0, 5.0], 4.0).unwrap();
        let result = shell(&solid, &[], 1.0).unwrap();

        assert!(result.validate().is_empty());
        assert_eq!(result.shells.len(), 2);
        let properties = analytic_mass_properties(&result).unwrap();
        let expected = 4.0 * PI * (4.0_f64.powi(3) - 3.0_f64.powi(3)) / 3.0;
        assert!((properties.volume - expected).abs() < 1e-8);
        assert_eq!(properties.centroid, [3.0, -2.0, 5.0]);
    }

    #[test]
    fn removing_a_box_face_opens_a_valid_shell() {
        let solid = make::cuboid([0.0; 3], [6.0, 5.0, 4.0]).unwrap();
        let removed = shell_face_at_point(&solid, [3.0, 2.5, 4.0]).unwrap();
        let result = shell(&solid, &[removed], 0.5).unwrap();

        assert!(result.validate().is_empty());
        assert_eq!(result.roots.len(), 1);
        assert_eq!(result.lumps.len(), 1);
    }
}
