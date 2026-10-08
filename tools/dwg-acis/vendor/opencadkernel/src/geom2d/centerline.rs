//! Centre-line construction between two finite straight segments.
//!
//! Selection points are part of the geometric input: for intersecting source
//! lines they select which of the four angular sectors is bisected. Finite
//! source endpoints determine the natural (unextended) result span.

use super::curve::Line;
use super::intersect::line_line;

const EPSILON: f64 = 1.0e-10;

/// Constructed centre line and its unextended endpoints.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CenterLineGeometry {
    pub start: [f64; 2],
    pub end: [f64; 2],
    pub base_start: [f64; 2],
    pub base_end: [f64; 2],
}

fn add(a: [f64; 2], b: [f64; 2]) -> [f64; 2] {
    [a[0] + b[0], a[1] + b[1]]
}

fn sub(a: [f64; 2], b: [f64; 2]) -> [f64; 2] {
    [a[0] - b[0], a[1] - b[1]]
}

fn mul(a: [f64; 2], scale: f64) -> [f64; 2] {
    [a[0] * scale, a[1] * scale]
}

fn dot(a: [f64; 2], b: [f64; 2]) -> f64 {
    a[0] * b[0] + a[1] * b[1]
}

fn unit(vector: [f64; 2]) -> Option<[f64; 2]> {
    let length = dot(vector, vector).sqrt();
    (length > EPSILON).then(|| mul(vector, length.recip()))
}

fn oriented_towards(direction: [f64; 2], origin: [f64; 2], pick: [f64; 2]) -> [f64; 2] {
    if dot(sub(pick, origin), direction) < 0.0 {
        mul(direction, -1.0)
    } else {
        direction
    }
}

fn span_on_axis(points: [[f64; 2]; 4], origin: [f64; 2], axis: [f64; 2]) -> (f64, f64) {
    points.into_iter().fold(
        (f64::INFINITY, f64::NEG_INFINITY),
        |(minimum, maximum), point| {
            let parameter = dot(sub(point, origin), axis);
            (minimum.min(parameter), maximum.max(parameter))
        },
    )
}

/// Construct the bisector/midline selected by `first_pick` and `second_pick`.
///
/// Parallel inputs produce a midline spanning the full finite extent of both
/// sources. Intersecting inputs use the picked half of each source to choose
/// the angular sector, then span all four finite endpoints. The two extension
/// values are applied independently beyond that natural span.
pub fn centerline_between(
    first: Line,
    second: Line,
    first_pick: [f64; 2],
    second_pick: [f64; 2],
    start_extension: f64,
    end_extension: f64,
) -> Option<CenterLineGeometry> {
    let first_direction = unit(first.direction())?;
    let second_direction = unit(second.direction())?;
    let points = [first.start, first.end, second.start, second.end];

    let (origin, mut axis) = if let Some((parameter, _)) = line_line(
        first.start,
        first_direction,
        second.start,
        second_direction,
    ) {
        let intersection = add(first.start, mul(first_direction, parameter));
        let first_ray = oriented_towards(first_direction, intersection, first_pick);
        let second_ray = oriented_towards(second_direction, intersection, second_pick);
        let bisector = unit(add(first_ray, second_ray))
            .or_else(|| unit(sub(first_ray, second_ray)))?;
        (intersection, bisector)
    } else {
        let second_aligned = if dot(first_direction, second_direction) < 0.0 {
            mul(second_direction, -1.0)
        } else {
            second_direction
        };
        let direction = unit(add(first_direction, second_aligned)).unwrap_or(first_direction);
        let direction = oriented_towards(direction, first.start, first_pick);
        let normal = [-direction[1], direction[0]];
        let normal_offset = points.into_iter().map(|point| dot(point, normal)).sum::<f64>() / 4.0;
        (mul(normal, normal_offset), direction)
    };

    let (mut minimum, mut maximum) = span_on_axis(points, origin, axis);
    if maximum - minimum <= EPSILON {
        return None;
    }
    // Stable endpoint identity follows the first selection direction. This is
    // important when independent start/end grip adjustments are persisted.
    if dot(axis, oriented_towards(first_direction, origin, first_pick)) < 0.0 {
        axis = mul(axis, -1.0);
        (minimum, maximum) = (-maximum, -minimum);
    }
    let base_start = add(origin, mul(axis, minimum));
    let base_end = add(origin, mul(axis, maximum));
    let start = add(base_start, mul(axis, -start_extension));
    let end = add(base_end, mul(axis, end_extension));
    if dot(sub(end, start), axis) <= EPSILON {
        return None;
    }
    Some(CenterLineGeometry {
        start,
        end,
        base_start,
        base_end,
    })
}
