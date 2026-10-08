//! Intersection curves of surface pairs with no closed form, marched on the
//! surfaces themselves.
//!
//! Two cylinders at an angle, a shaft grazing a fillet: their common curve
//! is a quartic or worse, and [`intersect`](super::intersect) leaves it
//! `Unknown`. Where the two faces' meshes cross, each crossing seeds a march:
//! from a point settled onto both surfaces, step along the line their
//! tangent planes share, settle again, and go on until the curve leaves the
//! ground both faces cover or comes back round to where it began. The points
//! are exact to the tolerance and dense where the curve bends; a cubic
//! through them is the curve the imprint cuts with.

use super::geometry::{Curve3, Surface};
use crate::space::{NurbsCurve3, Parameterization, Vec3};

/// The curves where two faces, given as triangles of `one` and `other`,
/// cross. `None` when a crossing cannot be followed — the surfaces touching
/// rather than crossing, or a march that will not settle.
///
/// `known` holds what earlier faces on the same two surfaces marched: a
/// surface split into several faces meets the other along one curve, and
/// marching it again from each face gives copies a hair apart that cut
/// slivers off between them. Crossings on a known curve are passed over, and
/// what is marched here is added to it.
pub(super) fn traced(
    one: &Surface,
    first: &[[Vec3; 3]],
    other: &Surface,
    second: &[[Vec3; 3]],
    known: &mut Vec<Vec<Vec3>>,
    tolerance: f64,
) -> Option<Vec<Curve3>> {
    // Near enough that the meshes could hide a meeting, yet not crossing:
    // touching, or crossing by less than the meshes show. Neither is known.
    let seeds = crossing_points(first, second);
    if seeds.is_empty() {
        return None;
    }
    let reach = shared_bounds(first, second)?;
    let size = reach.0.distance(reach.1).max(tolerance);
    let mut walks: Vec<Walk> = Vec::new();
    for seed in seeds {
        // ponytail: a seed this near a traced curve is taken as on it; two
        // branches closer than that would be read as one.
        let covered = |point: Vec3| {
            walks.iter().map(|walk| &walk.points).chain(known.iter()).any(|points| {
                points
                    .windows(2)
                    .any(|pair| point.distance_to_segment(pair[0], pair[1]) <= size * 1e-3)
            })
        };
        if covered(seed) {
            continue;
        }
        let start = settle(one, other, seed, tolerance)?;
        if covered(start) {
            continue;
        }
        walks.push(walk(one, other, start, reach, size, tolerance)?);
    }
    known.extend(walks.iter().map(|walk| walk.points.clone()));
    walks
        .into_iter()
        .filter(|walk| walk.points.len() >= 2)
        .map(|walk| {
            let points: Vec<[f64; 3]> = walk.points.iter().map(|point| point.to_array()).collect();
            // A closed curve leaves and arrives the same way, so the spline
            // has no corner where it was joined.
            let tangent = walk
                .closed
                .then(|| (walk.points[1] - walk.points[0]).normalize())
                .flatten()
                .map(Vec3::to_array);
            NurbsCurve3::interpolate_fit(&points, tangent, tangent, Parameterization::Chord)
                .map(Curve3::Nurbs)
        })
        .collect()
}

/// A curve marched out: its points in order, and whether it came back round
/// to its start.
struct Walk {
    points: Vec<Vec3>,
    closed: bool,
}

/// One point of every place the two triangle sets cross.
fn crossing_points(first: &[[Vec3; 3]], second: &[[Vec3; 3]]) -> Vec<Vec3> {
    let first_bounds: Vec<_> = first.iter().map(triangle_bounds).collect();
    let mut order: Vec<usize> = (0..first.len()).collect();
    order.sort_by(|a, b| first_bounds[*a].0.x.total_cmp(&first_bounds[*b].0.x));
    let mut out = Vec::new();
    for triangle in second {
        let (low, high) = triangle_bounds(triangle);
        for &index in &order {
            let (other_low, other_high) = first_bounds[index];
            if other_low.x > high.x {
                break;
            }
            if other_high.x < low.x
                || other_low.y > high.y
                || other_high.y < low.y
                || other_low.z > high.z
                || other_high.z < low.z
            {
                continue;
            }
            if let Some(point) = triangle_crossing(&first[index], triangle) {
                out.push(point);
            }
        }
    }
    out
}

fn triangle_bounds(t: &[Vec3; 3]) -> (Vec3, Vec3) {
    (
        Vec3::new(
            t[0].x.min(t[1].x).min(t[2].x),
            t[0].y.min(t[1].y).min(t[2].y),
            t[0].z.min(t[1].z).min(t[2].z),
        ),
        Vec3::new(
            t[0].x.max(t[1].x).max(t[2].x),
            t[0].y.max(t[1].y).max(t[2].y),
            t[0].z.max(t[1].z).max(t[2].z),
        ),
    )
}

/// The ground both triangle sets cover — where a curve on both faces can
/// be — widened a little so a march carries on past the faces' edges.
fn shared_bounds(first: &[[Vec3; 3]], second: &[[Vec3; 3]]) -> Option<(Vec3, Vec3)> {
    let span = |triangles: &[[Vec3; 3]]| {
        triangles.iter().map(triangle_bounds).reduce(|(low, high), (l, h)| {
            (
                Vec3::new(low.x.min(l.x), low.y.min(l.y), low.z.min(l.z)),
                Vec3::new(high.x.max(h.x), high.y.max(h.y), high.z.max(h.z)),
            )
        })
    };
    let ((a_low, a_high), (b_low, b_high)) = (span(first)?, span(second)?);
    let low = Vec3::new(a_low.x.max(b_low.x), a_low.y.max(b_low.y), a_low.z.max(b_low.z));
    let high = Vec3::new(a_high.x.min(b_high.x), a_high.y.min(b_high.y), a_high.z.min(b_high.z));
    let margin = low.distance(high) * 0.05;
    let widen = Vec3::new(margin, margin, margin);
    Some((low - widen, high + widen))
}

/// The middle of where two triangles cross.
fn triangle_crossing(a: &[Vec3; 3], b: &[Vec3; 3]) -> Option<Vec3> {
    let mut points = Vec::with_capacity(4);
    for (triangle, other) in [(a, b), (b, a)] {
        let [p0, p1, p2] = *triangle;
        for (p, q) in [(p0, p1), (p1, p2), (p2, p0)] {
            if let Some(point) = pierce(p, q, other) {
                points.push(point);
            }
        }
    }
    let count = points.len();
    (count > 0).then(|| {
        points.into_iter().fold(Vec3::new(0.0, 0.0, 0.0), |sum, point| sum + point)
            * (1.0 / count as f64)
    })
}

/// Where segment `pq` passes through triangle `t`.
fn pierce(p: Vec3, q: Vec3, t: &[Vec3; 3]) -> Option<Vec3> {
    let normal = (t[1] - t[0]).cross(t[2] - t[0]);
    let (dp, dq) = ((p - t[0]).dot(normal), (q - t[0]).dot(normal));
    if dp * dq > 0.0 || dp == dq {
        return None;
    }
    let point = p + (q - p) * (dp / (dp - dq));
    let inside = |a: Vec3, b: Vec3| (b - a).cross(point - a).dot(normal) >= 0.0;
    (inside(t[0], t[1]) && inside(t[1], t[2]) && inside(t[2], t[0])).then_some(point)
}

/// The surface point nearest `point`, with the surface's normal there.
fn foot(surface: &Surface, point: Vec3) -> Option<(Vec3, Vec3)> {
    let (u, v) = surface.parameters_at(point.to_array())?;
    let landed = Vec3::from(surface.point_at(u, v));
    let normal = Vec3::from(surface.normal_at(u, v)?).normalize()?;
    landed.is_finite().then_some((landed, normal))
}

/// Below this sine the two surfaces are taken as touching, not crossing:
/// their common line is not pinned down, and neither is a curve along it.
const GRAZING: f64 = 1e-4;

/// The direction the two surfaces' common curve runs at `point`.
fn heading(one: &Surface, other: &Surface, point: Vec3) -> Option<Vec3> {
    let (_, first) = foot(one, point)?;
    let (_, second) = foot(other, point)?;
    let along = first.cross(second);
    (along.length() > GRAZING).then(|| along.normalize()).flatten()
}

/// `point` pulled onto both surfaces at once: each step moves it to the
/// nearest point of the line where the two surfaces' tangent planes meet.
fn settle(one: &Surface, other: &Surface, mut point: Vec3, tolerance: f64) -> Option<Vec3> {
    for _ in 0..32 {
        let (first, first_normal) = foot(one, point)?;
        let (second, second_normal) = foot(other, point)?;
        if first.distance(point) <= tolerance * 1e-3 && second.distance(point) <= tolerance * 1e-3 {
            return Some(point);
        }
        // point + a·n1 + b·n2 on both tangent planes.
        let cosine = first_normal.dot(second_normal);
        let determinant = 1.0 - cosine * cosine;
        if determinant <= GRAZING * GRAZING {
            return None;
        }
        let (h1, h2) = ((first - point).dot(first_normal), (second - point).dot(second_normal));
        let a = (h1 - cosine * h2) / determinant;
        let b = (h2 - cosine * h1) / determinant;
        point = point + first_normal * a + second_normal * b;
    }
    let (first, _) = foot(one, point)?;
    let (second, _) = foot(other, point)?;
    (first.distance(point) <= tolerance && second.distance(point) <= tolerance).then_some(point)
}

/// The curve through `start`, marched both ways until it leaves `reach` or
/// closes on itself.
fn walk(
    one: &Surface,
    other: &Surface,
    start: Vec3,
    reach: (Vec3, Vec3),
    size: f64,
    tolerance: f64,
) -> Option<Walk> {
    let inside = |p: Vec3| {
        p.x >= reach.0.x
            && p.y >= reach.0.y
            && p.z >= reach.0.z
            && p.x <= reach.1.x
            && p.y <= reach.1.y
            && p.z <= reach.1.z
    };
    let longest = size / 64.0;
    let shortest = (size * 1e-9).max(tolerance * 1e-3);
    let mut halves: [Vec<Vec3>; 2] = [Vec::new(), Vec::new()];
    for (side, sign) in [1.0, -1.0].into_iter().enumerate() {
        let mut point = start;
        let mut direction = heading(one, other, start)? * sign;
        let mut step = longest / 16.0;
        let mut travelled = 0.0;
        let mut left = false;
        for _ in 0..100_000 {
            let guess = point + direction * step;
            let settled = settle(one, other, guess, tolerance)
                .and_then(|next| Some((next, heading(one, other, next)?)));
            let Some((next, mut ahead)) = settled else {
                step *= 0.5;
                if step < shortest {
                    return None;
                }
                continue;
            };
            if ahead.dot(direction) < 0.0 {
                ahead = ahead * -1.0;
            }
            // Too far for the bend: the settle may have jumped to another
            // branch, and the spline would cut the corner.
            let turn = ahead.dot(direction).clamp(-1.0, 1.0).acos();
            if turn > 0.1
                || next.distance(guess) > step * 0.5
                || (next - point).dot(direction) <= 0.0
            {
                step *= 0.5;
                if step < shortest {
                    return None;
                }
                continue;
            }
            travelled += next.distance(point);
            point = next;
            direction = ahead;
            halves[side].push(point);
            if side == 0 && travelled > step * 4.0 && point.distance(start) <= step * 1.5 {
                // Back round to the start: a closed curve, one way only. A
                // last step that ran past the start would fold the curve
                // back on itself to close it, so it is dropped, and so is
                // one too near the start to leave a span.
                let first = halves[0].first().copied()?;
                let leaving = (first - start).normalize()?;
                let mut points = vec![start];
                points.extend(halves[0].iter().copied());
                while points.len() > 3 {
                    let last = points[points.len() - 1];
                    if (last - start).dot(leaving) < 0.0 && last.distance(start) > step * 0.25 {
                        break;
                    }
                    points.pop();
                }
                points.push(start);
                return Some(Walk { points, closed: true });
            }
            if !inside(point) {
                left = true;
                break;
            }
            if turn < 0.03 {
                step = (step * 1.5).min(longest);
            }
        }
        if !left {
            return None;
        }
    }
    let [ahead, behind] = halves;
    let mut points: Vec<Vec3> = behind.into_iter().rev().collect();
    points.push(start);
    points.extend(ahead);
    Some(Walk { points, closed: false })
}
