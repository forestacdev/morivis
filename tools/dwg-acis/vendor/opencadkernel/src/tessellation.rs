//! Shared tessellation policy.

use std::f64::consts::{FRAC_PI_2, PI};

/// Default maximum change of direction between samples: 7.5 degrees.
pub const DEFAULT_ANGLE: f64 = PI / 24.0;
/// Coarsest chordal display angle: 20 degrees.
pub const DISPLAY_ANGLE: f64 = PI / 9.0;
/// Finest display angle: 5 degrees.
pub const FINE_ANGLE: f64 = PI / 36.0;

/// Returns a finite angular threshold in radians.
pub fn angle(value: f64) -> f64 {
    if value.is_finite() && value > 0.0 {
        value.min(FRAC_PI_2)
    } else {
        DEFAULT_ANGLE
    }
}

/// Maps a display resolution to a maximum direction change.
pub fn angle_for_resolution(resolution: f64) -> f64 {
    let resolution = if resolution.is_finite() && resolution > 0.0 {
        resolution.clamp(0.01, 10.0)
    } else {
        1.0
    };
    angle(DEFAULT_ANGLE / resolution.sqrt()).max(FINE_ANGLE)
}

/// Maps display resolution to an angular cap for chordal tessellation.
pub fn display_angle_for_resolution(resolution: f64) -> f64 {
    let resolution = if resolution.is_finite() && resolution > 0.0 {
        resolution.clamp(0.01, 10.0)
    } else {
        1.0
    };
    angle(DISPLAY_ANGLE / resolution.max(1.0).sqrt()).max(FINE_ANGLE)
}

/// Angle between two directions. A zero direction cannot satisfy a bound.
pub(crate) fn direction_angle<const N: usize>(a: [f64; N], b: [f64; N]) -> f64 {
    let dot = (0..N).map(|axis| a[axis] * b[axis]).sum::<f64>();
    let aa = (0..N).map(|axis| a[axis] * a[axis]).sum::<f64>();
    let bb = (0..N).map(|axis| b[axis] * b[axis]).sum::<f64>();
    let length = (aa * bb).sqrt();
    if !length.is_finite() || length <= f64::MIN_POSITIVE {
        PI
    } else {
        (dot / length).clamp(-1.0, 1.0).acos()
    }
}

/// Largest separation between any two sampled directions.
pub(crate) fn max_direction_angle<const N: usize>(directions: &[[f64; N]]) -> f64 {
    let mut largest: f64 = 0.0;
    for from in 0..directions.len() {
        for to in from + 1..directions.len() {
            largest = largest.max(direction_angle(directions[from], directions[to]));
        }
    }
    largest
}

/// Samples a parametric space curve by tangent rotation.
pub fn sample_curve3_angle<P, T>(
    point_at: P,
    tangent_at: T,
    max_angle: f64,
) -> Vec<[f64; 3]>
where
    P: Fn(f64) -> [f64; 3],
    T: Fn(f64) -> [f64; 3],
{
    fn refine<P, T>(
        point_at: &P,
        tangent_at: &T,
        from: f64,
        to: f64,
        max_angle: f64,
        depth: u32,
        out: &mut Vec<[f64; 3]>,
    ) where
        P: Fn(f64) -> [f64; 3],
        T: Fn(f64) -> [f64; 3],
    {
        const MAX_DEPTH: u32 = 16;
        let directions = [0.0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0]
            .map(|unit| tangent_at(from + (to - from) * unit));
        let split = depth < 2 || max_direction_angle(&directions) > max_angle;
        if split && depth < MAX_DEPTH {
            let middle = 0.5 * (from + to);
            refine(
                point_at,
                tangent_at,
                from,
                middle,
                max_angle,
                depth + 1,
                out,
            );
            refine(
                point_at,
                tangent_at,
                middle,
                to,
                max_angle,
                depth + 1,
                out,
            );
        } else {
            out.push(point_at(to));
        }
    }

    let max_angle = angle(max_angle);
    let mut out = vec![point_at(0.0)];
    refine(
        &point_at,
        &tangent_at,
        0.0,
        1.0,
        max_angle,
        0,
        &mut out,
    );
    out
}
