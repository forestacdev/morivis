//! Exact mass properties for analytic closed solids.

use super::{Body, Surface};
use crate::space::Vec3;
use std::f64::consts::PI;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MassProperties {
    pub volume: f64,
    pub centroid: [f64; 3],
    pub moment_of_inertia: [f64; 3],
    pub principal_directions: [f64; 9],
    pub principal_moments: [f64; 3],
    pub product_of_inertia: [f64; 3],
    pub radii_of_gyration: [f64; 3],
}

impl MassProperties {
    /// Return the same body translated in world space.
    pub fn translated(mut self, delta: [f64; 3]) -> Self {
        let old = self.centroid;
        let new = [old[0] + delta[0], old[1] + delta[1], old[2] + delta[2]];
        let square_change = |axis| delta[axis] * (2.0 * old[axis] + delta[axis]);
        self.moment_of_inertia[0] += self.volume * (square_change(1) + square_change(2));
        self.moment_of_inertia[1] += self.volume * (square_change(0) + square_change(2));
        self.moment_of_inertia[2] += self.volume * (square_change(0) + square_change(1));
        let product_change = |first, second| {
            old[first] * delta[second] + old[second] * delta[first] + delta[first] * delta[second]
        };
        self.product_of_inertia[0] -= self.volume * product_change(0, 1);
        self.product_of_inertia[1] -= self.volume * product_change(1, 2);
        self.product_of_inertia[2] -= self.volume * product_change(2, 0);
        self.radii_of_gyration = self
            .moment_of_inertia
            .map(|moment| (moment.max(0.0) / self.volume).sqrt());
        self.centroid = new;
        self
    }
}

/// Exact properties for complete analytic spheres and circular cylinders,
/// including the concentric closed shells produced by [`super::shell`].
pub fn analytic_mass_properties(body: &Body) -> Option<MassProperties> {
    sphere_properties(body)
        .or_else(|| cylindrical_sector_properties(body))
        .or_else(|| cylinder_properties(body))
}

fn cylindrical_sector_properties(body: &Body) -> Option<MassProperties> {
    let mut cylinders = Vec::new();
    for face_key in body.face_keys() {
        let face = body.faces.get(face_key)?;
        match body.surfaces.get(face.surface)? {
            Surface::Cylinder(cylinder) => cylinders.push((face_key, *cylinder)),
            Surface::Plane(_) => {}
            _ => return None,
        }
    }
    if cylinders.len() != 2 {
        return None;
    }
    cylinders.sort_by(|left, right| right.1.radius.total_cmp(&left.1.radius));
    let (outer_face, outer) = cylinders[0];
    let (inner_face, inner) = cylinders[1];
    let axis = Vec3::from(outer.base.normal()?).normalize()?;
    let inner_axis = Vec3::from(inner.base.normal()?).normalize()?;
    let scale = outer.radius.abs().max(1.0);
    let outer_origin = Vec3::from(outer.base.origin);
    let inner_origin = Vec3::from(inner.base.origin);
    let inner_lateral = inner_origin - axis * (inner_origin - outer_origin).dot(axis);
    if !outer.radius.is_finite()
        || !inner.radius.is_finite()
        || inner.radius <= 0.0
        || inner.radius >= outer.radius
        || inner_axis.dot(axis).abs() < 1.0 - 1e-8
        || inner_lateral.distance(outer_origin) > scale * 1e-8
    {
        return None;
    }
    let patch = super::thicken::rectangular_patch(body, outer_face, &Surface::Cylinder(outer))?;
    let inner_patch =
        super::thicken::rectangular_patch(body, inner_face, &Surface::Cylinder(inner))?;
    let inner_bottom = inner_origin + inner_axis * inner_patch.v_start;
    let inner_top = inner_bottom + inner_axis * inner_patch.v_sweep;
    let outer_bottom = patch.v_start;
    let outer_top = patch.v_start + patch.v_sweep;
    let z0 = (inner_bottom - outer_origin).dot(axis);
    let z1 = (inner_top - outer_origin).dot(axis);
    if (z0.min(z1) - outer_bottom).abs() > scale * 1e-8
        || (z0.max(z1) - outer_top).abs() > scale * 1e-8
        || (inner_patch.u_sweep - patch.u_sweep).abs() > 1e-8
        || body.edges.iter().any(|(_, edge)| edge.coedges.len() != 2)
    {
        return None;
    }
    let outer_mid = Vec3::from(outer.base.vector_at([
        (patch.u_start + patch.u_sweep * 0.5).cos(),
        (patch.u_start + patch.u_sweep * 0.5).sin(),
    ]))
    .normalize()?;
    let inner_mid = Vec3::from(inner.base.vector_at([
        (inner_patch.u_start + inner_patch.u_sweep * 0.5).cos(),
        (inner_patch.u_start + inner_patch.u_sweep * 0.5).sin(),
    ]))
    .normalize()?;
    if patch.u_sweep < 2.0 * PI - 1e-8 && outer_mid.distance(inner_mid) > 1e-8 {
        return None;
    }
    let angle = patch.u_sweep;
    let height = patch.v_sweep;
    if !angle.is_finite()
        || !height.is_finite()
        || angle <= 0.0
        || angle > 2.0 * PI + 1e-8
        || height <= 0.0
    {
        return None;
    }

    let radial_square = outer.radius.powi(2) - inner.radius.powi(2);
    let radial_cube = outer.radius.powi(3) - inner.radius.powi(3);
    let radial_fourth = outer.radius.powi(4) - inner.radius.powi(4);
    let area = 0.5 * radial_square * angle;
    let half = angle * 0.5;
    let centroid_radius = if (angle - 2.0 * PI).abs() <= 1e-8 {
        0.0
    } else {
        4.0 * half.sin() * radial_cube / (3.0 * angle * radial_square)
    };
    let volume = area * height;
    let middle = patch.u_start + half;
    let radial = Vec3::from(outer.base.vector_at([middle.cos(), middle.sin()])).normalize()?;
    let tangent = axis.cross(radial).normalize()?;
    let centre_on_axis = outer_origin + axis * (patch.v_start + height * 0.5);
    let centroid = (centre_on_axis + radial * centroid_radius).to_array();

    let factor = radial_fourth * 0.25;
    let radial_second = factor * (angle * 0.5 + angle.sin() * 0.5);
    let tangent_second = factor * (angle * 0.5 - angle.sin() * 0.5);
    let height_second = area * height.powi(3) / 12.0;
    let radial_moment = height * tangent_second + height_second;
    let tangent_moment = height * (radial_second - area * centroid_radius.powi(2)) + height_second;
    let axial_moment = height * (radial_second + tangent_second - area * centroid_radius.powi(2));
    assemble(
        volume,
        centroid,
        [radial_moment, tangent_moment, axial_moment],
        [radial.to_array(), tangent.to_array(), axis.to_array()],
    )
}

fn sphere_properties(body: &Body) -> Option<MassProperties> {
    let mut spheres = Vec::new();
    for face_key in body.face_keys() {
        let face = body.faces.get(face_key)?;
        let Surface::Sphere(sphere) = body.surfaces.get(face.surface)? else {
            return None;
        };
        spheres.push(*sphere);
    }
    if !(1..=2).contains(&spheres.len()) {
        return None;
    }
    spheres.sort_by(|left, right| right.radius.total_cmp(&left.radius));
    let center = Vec3::from(spheres[0].frame.origin);
    let scale = spheres[0].radius.abs().max(1.0);
    if spheres.iter().any(|sphere| {
        !sphere.radius.is_finite()
            || sphere.radius <= 0.0
            || center.distance(Vec3::from(sphere.frame.origin)) > scale * 1e-8
    }) {
        return None;
    }
    let outer = spheres[0].radius;
    let inner = spheres.get(1).map_or(0.0, |sphere| sphere.radius);
    if inner >= outer {
        return None;
    }
    let volume = 4.0 * PI * (outer.powi(3) - inner.powi(3)) / 3.0;
    let principal = 8.0 * PI * (outer.powi(5) - inner.powi(5)) / 15.0;
    assemble(
        volume,
        center.to_array(),
        [principal; 3],
        [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
    )
}

fn cylinder_properties(body: &Body) -> Option<MassProperties> {
    let mut cylinders = Vec::new();
    let mut planes = Vec::new();
    for face_key in body.face_keys() {
        let face = body.faces.get(face_key)?;
        match body.surfaces.get(face.surface)? {
            Surface::Cylinder(cylinder) => cylinders.push(*cylinder),
            Surface::Plane(plane) => planes.push(*plane),
            _ => return None,
        }
    }
    if cylinders.is_empty() || planes.is_empty() {
        return None;
    }
    cylinders.sort_by(|left, right| right.radius.total_cmp(&left.radius));
    let outer = cylinders[0];
    let axis = Vec3::from(outer.base.normal()?).normalize()?;
    let x = Vec3::from(outer.base.x_axis).normalize()?;
    let x = (x - axis * x.dot(axis)).normalize()?;
    let y = axis.cross(x).normalize()?;
    let reference = Vec3::from(outer.base.origin);
    let reference_lateral = reference - axis * reference.dot(axis);
    let scale = outer.radius.abs().max(1.0);
    if cylinders.iter().any(|cylinder| {
        if !cylinder.radius.is_finite() || cylinder.radius <= 0.0 {
            return true;
        }
        let Some(candidate_normal) = cylinder.base.normal() else {
            return true;
        };
        let Some(candidate_axis) = Vec3::from(candidate_normal).normalize() else {
            return true;
        };
        let origin = Vec3::from(cylinder.base.origin);
        let lateral = origin - axis * origin.dot(axis);
        candidate_axis.dot(axis).abs() < 1.0 - 1e-8
            || lateral.distance(reference_lateral) > scale * 1e-8
    }) {
        return None;
    }
    cylinders.dedup_by(|left, right| (left.radius - right.radius).abs() <= scale * 1e-8);
    if !(1..=2).contains(&cylinders.len()) {
        return None;
    }
    let mut positions = planes
        .iter()
        .map(|plane| {
            let normal = Vec3::from(plane.normal()?);
            (normal.dot(axis).abs() >= 1.0 - 1e-8)
                .then(|| (Vec3::from(plane.origin) - reference).dot(axis))
        })
        .collect::<Option<Vec<_>>>()?;
    positions.sort_by(f64::total_cmp);
    let tolerance = positions
        .iter()
        .map(|value| value.abs())
        .fold(scale, f64::max)
        * 1e-8;
    positions.dedup_by(|left, right| (*left - *right).abs() <= tolerance);
    if positions.len() != cylinders.len() * 2 {
        return None;
    }

    let outer_min = positions[0];
    let outer_max = *positions.last()?;
    let outer_height = outer_max - outer_min;
    if outer_height <= 0.0 {
        return None;
    }
    let outer_volume = PI * outer.radius.powi(2) * outer_height;
    let outer_center = (outer_min + outer_max) * 0.5;

    let (inner_radius, inner_height, inner_volume, inner_center) = if cylinders.len() == 2 {
        let inner = cylinders[1];
        if inner.radius >= outer.radius {
            return None;
        }
        let inner_min = positions[1];
        let inner_max = positions[2];
        let height = inner_max - inner_min;
        if height <= 0.0 {
            return None;
        }
        (
            inner.radius,
            height,
            PI * inner.radius.powi(2) * height,
            (inner_min + inner_max) * 0.5,
        )
    } else {
        (0.0, 0.0, 0.0, outer_center)
    };
    let volume = outer_volume - inner_volume;
    if !volume.is_finite() || volume <= 0.0 {
        return None;
    }
    let center_at = (outer_volume * outer_center - inner_volume * inner_center) / volume;
    let centroid = (reference + axis * center_at).to_array();
    let axial = 0.5 * (outer_volume * outer.radius.powi(2) - inner_volume * inner_radius.powi(2));
    let transverse = outer_volume * (3.0 * outer.radius.powi(2) + outer_height.powi(2)) / 12.0
        + outer_volume * (outer_center - center_at).powi(2)
        - inner_volume * (3.0 * inner_radius.powi(2) + inner_height.powi(2)) / 12.0
        - inner_volume * (inner_center - center_at).powi(2);
    assemble(
        volume,
        centroid,
        [transverse, transverse, axial],
        [x.to_array(), y.to_array(), axis.to_array()],
    )
}

fn assemble(
    volume: f64,
    centroid: [f64; 3],
    principal_moments: [f64; 3],
    axes: [[f64; 3]; 3],
) -> Option<MassProperties> {
    if !volume.is_finite()
        || volume <= 0.0
        || centroid
            .iter()
            .chain(principal_moments.iter())
            .any(|value| !value.is_finite())
    {
        return None;
    }
    let mut central = [[0.0; 3]; 3];
    for principal in 0..3 {
        for row in 0..3 {
            for column in 0..3 {
                central[row][column] +=
                    principal_moments[principal] * axes[principal][row] * axes[principal][column];
            }
        }
    }
    let c = Vec3::from(centroid);
    let c2 = c.dot(c);
    let mut origin = central;
    for row in 0..3 {
        for column in 0..3 {
            origin[row][column] +=
                volume * (if row == column { c2 } else { 0.0 } - centroid[row] * centroid[column]);
        }
    }
    let moment_of_inertia = [origin[0][0], origin[1][1], origin[2][2]];
    let product_of_inertia = [origin[0][1], origin[1][2], origin[2][0]];
    let radii_of_gyration = moment_of_inertia.map(|moment| (moment.max(0.0) / volume).sqrt());
    Some(MassProperties {
        volume,
        centroid,
        moment_of_inertia,
        principal_directions: [
            axes[0][0], axes[0][1], axes[0][2], axes[1][0], axes[1][1], axes[1][2], axes[2][0],
            axes[2][1], axes[2][2],
        ],
        principal_moments,
        product_of_inertia,
        radii_of_gyration,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::brep::make;

    #[test]
    fn a_translated_sphere_has_exact_mass_properties() {
        let body = make::sphere([2.0, -3.0, 5.0], 2.0).unwrap();
        let properties = analytic_mass_properties(&body).unwrap();

        assert!((properties.volume - 32.0 * PI / 3.0).abs() < 1e-10);
        assert_eq!(properties.centroid, [2.0, -3.0, 5.0]);
        let central = 2.0 * properties.volume * 4.0 / 5.0;
        assert!(properties
            .principal_moments
            .iter()
            .all(|moment| (*moment - central).abs() < 1e-10));
    }

    #[test]
    fn a_cylinder_has_exact_volume_centroid_and_principal_moments() {
        let body = make::cylinder([1.0, 2.0, 3.0], 2.0, 6.0).unwrap();
        let properties = analytic_mass_properties(&body).unwrap();

        let volume = 24.0 * PI;
        assert!((properties.volume - volume).abs() < 1e-10);
        assert_eq!(properties.centroid, [1.0, 2.0, 6.0]);
        assert!((properties.principal_moments[0] - 4.0 * volume).abs() < 1e-10);
        assert!((properties.principal_moments[1] - 4.0 * volume).abs() < 1e-10);
        assert!((properties.principal_moments[2] - 2.0 * volume).abs() < 1e-10);
    }

    #[test]
    fn translating_properties_matches_translating_the_body() {
        let properties = analytic_mass_properties(&make::sphere([2.0, -3.0, 5.0], 2.0).unwrap())
            .unwrap()
            .translated([7.0, 11.0, -13.0]);
        let expected =
            analytic_mass_properties(&make::sphere([9.0, 8.0, -8.0], 2.0).unwrap()).unwrap();

        assert_eq!(properties.centroid, expected.centroid);
        for (actual, expected) in properties
            .moment_of_inertia
            .into_iter()
            .chain(properties.product_of_inertia)
            .zip(
                expected
                    .moment_of_inertia
                    .into_iter()
                    .chain(expected.product_of_inertia),
            )
        {
            assert!((actual - expected).abs() < 1e-9);
        }
    }
}
