//! Filling a polygon with triangles.
//!
//! Every surface that has to be drawn or measured by area ends up needing
//! this: a face's boundary in its own parameter space is a ring of points,
//! and a renderer wants triangles.
//!
//! # Ear clipping, and why holes are bridged rather than special-cased
//!
//! The method is the simple one: find a corner whose triangle contains no
//! other vertex, cut it off, repeat. Candidate corners are selected by shape
//! score before testing containment, so the first valid candidate is the
//! preferred ear. Difficult rings can still require testing every candidate;
//! the worst case remains cubic in the number of vertices.
//!
//! Holes are joined to the outer ring by a bridge: a pair of coincident edges
//! run out to the hole, round it, and back. The result is one ring with a
//! slit in it, which ear clipping then handles with no cases of its own. The
//! slit's two edges are zero-width and vanish in the triangulation.
//!
//! # What it will not do
//!
//! A self-intersecting ring has no inside to fill, and no triangulation of it
//! is right. That returns nothing rather than a plausible mesh, on the
//! principle that a caller can draw nothing but cannot un-draw a wrong shape.

use super::vec::Vec2;

#[derive(Clone, Copy)]
struct RingBounds {
    min: Vec2,
    max: Vec2,
}

impl RingBounds {
    fn of(ring: &[[f64; 2]]) -> Option<Self> {
        let mut points = ring.iter().copied().map(Vec2::from);
        let first = points.next()?;
        let mut bounds = Self {
            min: first,
            max: first,
        };
        for point in points {
            bounds.min.x = bounds.min.x.min(point.x);
            bounds.min.y = bounds.min.y.min(point.y);
            bounds.max.x = bounds.max.x.max(point.x);
            bounds.max.y = bounds.max.y.max(point.y);
        }
        Some(bounds)
    }

    fn overlaps(self, other: Self) -> bool {
        self.max.x >= other.min.x
            && other.max.x >= self.min.x
            && self.max.y >= other.min.y
            && other.max.y >= self.min.y
    }
}

struct CheckedRing {
    points: Vec<[f64; 2]>,
    area: f64,
    bounds: RingBounds,
}

/// A validated polygon and its axis-aligned local frame.
#[derive(Clone, Debug, PartialEq)]
pub struct PolygonFrame {
    pub origin: [f64; 2],
    pub size: [f64; 2],
    pub points: Vec<[f64; 2]>,
}

/// Cleans and validates one simple polygon.
pub fn polygon_frame(input: &[[f64; 2]], tolerance: super::Tolerance) -> Option<PolygonFrame> {
    if input.iter().flatten().any(|value| !value.is_finite()) {
        return None;
    }
    let limit = tolerance.linear();
    let mut points = Vec::with_capacity(input.len());
    for &point in input {
        if points.last().is_none_or(|previous| {
            Vec2::from(*previous).distance(Vec2::from(point)) > limit
        }) {
            points.push(point);
        }
    }
    while points.len() > 1
        && Vec2::from(points[0]).distance(Vec2::from(*points.last().unwrap())) <= limit
    {
        points.pop();
    }
    let bounds = RingBounds::of(&points)?;
    let size = [bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y];
    let scale = size[0].max(size[1]);
    let area = signed_area_arrays(&points).abs();
    if size[0] <= limit
        || size[1] <= limit
        || area <= limit * scale.max(limit)
        || !simple(&points, limit)
    {
        return None;
    }
    Some(PolygonFrame {
        origin: [bounds.min.x, bounds.min.y],
        size,
        points,
    })
}

/// Containment depth of each input ring. Even depths are filled exteriors.
pub fn nesting_depths(input: &[Vec<[f64; 2]>]) -> Vec<usize> {
    let rings: Vec<Vec<[f64; 2]>> = input.iter().map(|ring| sanitize(ring)).collect();
    let areas: Vec<f64> = rings
        .iter()
        .map(|ring| signed_area_arrays(ring).abs())
        .collect();

    rings
        .iter()
        .enumerate()
        .map(|(index, ring)| {
            rings
                .iter()
                .enumerate()
                .filter(|(other, outer)| {
                    *other != index
                        && areas[*other] > areas[index]
                        && ring_strictly_contains(outer, ring)
                })
                .count()
        })
        .collect()
}

/// Triangulates rings using even-odd containment.
///
/// Disjoint outer rings, holes, and nested islands may be mixed in any order.
/// Invalid intersecting components are omitted.
pub fn rings(input: &[Vec<[f64; 2]>]) -> (Vec<[f64; 2]>, Vec<[usize; 3]>) {
    let mut rings = Vec::new();
    let mut invalid = Vec::new();
    for raw in input {
        let points = sanitize(raw);
        let Some(bounds) = RingBounds::of(&points) else {
            continue;
        };
        let area = signed_area_arrays(&points);
        if !simple(&points, 0.0) || !area.is_finite() || area == 0.0 {
            invalid.push(CheckedRing {
                points,
                area: area.abs(),
                bounds,
            });
            continue;
        }
        rings.push(CheckedRing {
            points,
            area: area.abs(),
            bounds,
        });
    }

    let mut bad = vec![false; rings.len()];
    for first in 0..rings.len() {
        for second in first + 1..rings.len() {
            if rings[first].bounds.overlaps(rings[second].bounds)
                && ring_boundaries_properly_cross(&rings[first].points, &rings[second].points)
            {
                bad[first] = true;
                bad[second] = true;
            }
        }
    }
    for (index, ring) in rings.iter().enumerate() {
        if invalid.iter().any(|other| rings_interact(ring, other)) {
            bad[index] = true;
        }
    }
    loop {
        let active_bad: Vec<usize> = bad
            .iter()
            .enumerate()
            .filter_map(|(index, bad)| bad.then_some(index))
            .collect();
        let mut changed = false;
        for (index, ring) in rings.iter().enumerate() {
            if !bad[index]
                && active_bad
                    .iter()
                    .any(|other| rings_interact(ring, &rings[*other]))
            {
                bad[index] = true;
                changed = true;
            }
        }
        if !changed {
            break;
        }
    }

    let valid: Vec<CheckedRing> = rings
        .into_iter()
        .zip(bad)
        .filter_map(|(ring, bad)| (!bad).then_some(ring))
        .collect();
    let mut parent = vec![None; valid.len()];
    for index in 0..valid.len() {
        parent[index] = (0..valid.len())
            .filter(|other| {
                    *other != index
                        && valid[*other].area > valid[index].area
                    && ring_strictly_contains(&valid[*other].points, &valid[index].points)
            })
            .min_by(|a, b| valid[*a].area.total_cmp(&valid[*b].area));
    }
    let depth: Vec<usize> = (0..valid.len())
        .map(|index| {
            let mut depth = 0;
            let mut next = parent[index];
            while let Some(ancestor) = next {
                depth += 1;
                next = parent[ancestor];
            }
            depth
        })
        .collect();

    let mut points = Vec::new();
    let mut triangles = Vec::new();
    for root in (0..valid.len()).filter(|index| parent[*index].is_none()) {
        let members: Vec<usize> = (0..valid.len())
            .filter(|index| root_of(*index, &parent) == root)
            .collect();
        let mut component_points = Vec::new();
        let mut component_triangles = Vec::new();
        let mut complete = true;
        for outer in members.iter().copied().filter(|index| depth[*index] % 2 == 0) {
            let holes: Vec<Vec<[f64; 2]>> = members
                .iter()
                .copied()
                .filter(|index| parent[*index] == Some(outer) && depth[*index] % 2 == 1)
                .map(|index| valid[index].points.clone())
                .collect();
            let expected = valid[outer].area
                - holes.iter().map(|hole| signed_area_arrays(hole).abs()).sum::<f64>();
            let (local_points, local_triangles) = polygon(&valid[outer].points, &holes);
            if !triangulation_matches(&local_points, &local_triangles, expected) {
                complete = false;
                break;
            }
            let base = component_points.len();
            component_points.extend(local_points);
            component_triangles.extend(local_triangles.into_iter().map(|triangle| {
                [triangle[0] + base, triangle[1] + base, triangle[2] + base]
            }));
        }
        if complete {
            let base = points.len();
            points.extend(component_points);
            triangles.extend(component_triangles.into_iter().map(|triangle| {
                [triangle[0] + base, triangle[1] + base, triangle[2] + base]
            }));
        }
    }
    (points, triangles)
}

fn rings_interact(first: &CheckedRing, second: &CheckedRing) -> bool {
    first.bounds.overlaps(second.bounds)
        && (ring_boundaries_intersect(&first.points, &second.points)
            || ring_strictly_contains(&first.points, &second.points)
            || ring_strictly_contains(&second.points, &first.points))
}

fn sanitize(ring: &[[f64; 2]]) -> Vec<[f64; 2]> {
    if ring.iter().flatten().any(|value| !value.is_finite()) {
        return Vec::new();
    }
    let mut points = Vec::with_capacity(ring.len());
    for point in ring {
        if points.last() != Some(point) {
            points.push(*point);
        }
    }
    while points.len() > 1 && points.first() == points.last() {
        points.pop();
    }
    // A corner whose two edges fold back onto each other (a zero-area spike)
    // encloses nothing, but leaves the ring non-simple: drop it, and the
    // duplicate it may leave behind, until none remain.
    let mut index = 0;
    while points.len() >= 3 && index < points.len() {
        let count = points.len();
        let before = Vec2::from(points[(index + count - 1) % count]);
        let here = Vec2::from(points[index]);
        let after = Vec2::from(points[(index + 1) % count]);
        let incoming = before - here;
        let outgoing = after - here;
        let length = incoming.length().max(outgoing.length()).max(1.0);
        let epsilon = 64.0 * f64::EPSILON * length * length;
        if incoming.cross(outgoing).abs() > epsilon || incoming.dot(outgoing) <= 0.0 {
            index += 1;
            continue;
        }
        points.remove(index);
        let count = points.len();
        let previous = (index + count - 1) % count;
        if count > 1 && points[previous] == points[index % count] {
            points.remove(index % count);
        }
        index = index.saturating_sub(1);
    }
    points
}

fn signed_area_arrays(ring: &[[f64; 2]]) -> f64 {
    let points: Vec<Vec2> = ring.iter().copied().map(Vec2::from).collect();
    signed_area(&points)
}

fn simple(ring: &[[f64; 2]], tolerance: f64) -> bool {
    if ring.len() < 3 {
        return false;
    }
    for first in 0..ring.len() {
        if (first + 1..ring.len()).any(|second| {
            Vec2::from(ring[first]).distance(Vec2::from(ring[second])) <= tolerance
        }) {
            return false;
        }
    }
    for index in 0..ring.len() {
        let before = Vec2::from(ring[(index + ring.len() - 1) % ring.len()]);
        let here = Vec2::from(ring[index]);
        let after = Vec2::from(ring[(index + 1) % ring.len()]);
        let incoming = before - here;
        let outgoing = after - here;
        let length = incoming.length().max(outgoing.length()).max(1.0);
        let epsilon = (64.0 * f64::EPSILON * length * length).max(tolerance * length);
        if incoming.cross(outgoing).abs() <= epsilon && incoming.dot(outgoing) > 0.0 {
            return false;
        }
    }
    for first in 0..ring.len() {
        let first_next = (first + 1) % ring.len();
        for second in first + 1..ring.len() {
            let second_next = (second + 1) % ring.len();
            if first_next == second || second_next == first {
                continue;
            }
            if segments_intersect_with_tolerance(
                ring[first],
                ring[first_next],
                ring[second],
                ring[second_next],
                tolerance,
            ) {
                return false;
            }
        }
    }
    true
}

fn ring_boundaries_intersect(first: &[[f64; 2]], second: &[[f64; 2]]) -> bool {
    (0..first.len()).any(|a| {
        (0..second.len()).any(|b| {
            segments_intersect(
                first[a],
                first[(a + 1) % first.len()],
                second[b],
                second[(b + 1) % second.len()],
            )
        })
    })
}

fn ring_boundaries_properly_cross(first: &[[f64; 2]], second: &[[f64; 2]]) -> bool {
    (0..first.len()).any(|a| {
        (0..second.len()).any(|b| {
            segments_properly_cross(
                first[a],
                first[(a + 1) % first.len()],
                second[b],
                second[(b + 1) % second.len()],
            )
        })
    })
}

fn segments_properly_cross(a: [f64; 2], b: [f64; 2], c: [f64; 2], d: [f64; 2]) -> bool {
    let (a, b, c, d) = (Vec2::from(a), Vec2::from(b), Vec2::from(c), Vec2::from(d));
    let turn = |p: Vec2, q: Vec2, r: Vec2| (q - p).cross(r - p);
    let values = [turn(a, b, c), turn(a, b, d), turn(c, d, a), turn(c, d, b)];
    let scale = (b - a).length_squared().max((d - c).length_squared()).max(1.0);
    let epsilon = 64.0 * f64::EPSILON * scale;
    (values[0] > epsilon && values[1] < -epsilon
        || values[0] < -epsilon && values[1] > epsilon)
        && (values[2] > epsilon && values[3] < -epsilon
            || values[2] < -epsilon && values[3] > epsilon)
}

fn segments_intersect(a: [f64; 2], b: [f64; 2], c: [f64; 2], d: [f64; 2]) -> bool {
    segments_intersect_with_tolerance(a, b, c, d, 0.0)
}

fn segments_intersect_with_tolerance(
    a: [f64; 2],
    b: [f64; 2],
    c: [f64; 2],
    d: [f64; 2],
    tolerance: f64,
) -> bool {
    let (a, b, c, d) = (Vec2::from(a), Vec2::from(b), Vec2::from(c), Vec2::from(d));
    let turn = |p: Vec2, q: Vec2, r: Vec2| (q - p).cross(r - p);
    let values = [turn(a, b, c), turn(a, b, d), turn(c, d, a), turn(c, d, b)];
    let length = (b - a).length().max((d - c).length()).max(1.0);
    let epsilon = (64.0 * f64::EPSILON * length * length).max(tolerance * length);
    let on = |p: Vec2, q: Vec2, r: Vec2, value: f64| {
        value.abs() <= epsilon
            && r.x >= p.x.min(q.x) - tolerance
            && r.x <= p.x.max(q.x) + tolerance
            && r.y >= p.y.min(q.y) - tolerance
            && r.y <= p.y.max(q.y) + tolerance
    };
    (values[0] > epsilon && values[1] < -epsilon
        || values[0] < -epsilon && values[1] > epsilon)
        && (values[2] > epsilon && values[3] < -epsilon
            || values[2] < -epsilon && values[3] > epsilon)
        || on(a, b, c, values[0])
        || on(a, b, d, values[1])
        || on(c, d, a, values[2])
        || on(c, d, b, values[3])
}

fn ring_contains(ring: &[[f64; 2]], point: [f64; 2]) -> bool {
    ring.iter()
        .zip(ring.iter().cycle().skip(1))
        .take(ring.len())
        .fold(false, |inside, (from, to)| {
            inside
                ^ ((from[1] > point[1]) != (to[1] > point[1])
                    && point[0]
                        < (to[0] - from[0]) * (point[1] - from[1]) / (to[1] - from[1])
                            + from[0])
        })
}

fn ring_strictly_contains(outer: &[[f64; 2]], inner: &[[f64; 2]]) -> bool {
    inner
        .iter()
        .copied()
        .find(|point| !point_on_boundary(outer, *point))
        .is_some_and(|point| ring_contains(outer, point))
}

fn point_on_boundary(ring: &[[f64; 2]], point: [f64; 2]) -> bool {
    ring.iter()
        .zip(ring.iter().cycle().skip(1))
        .take(ring.len())
        .any(|(&start, &end)| point_on_segment(start, end, point))
}

fn point_on_segment(start: [f64; 2], end: [f64; 2], point: [f64; 2]) -> bool {
    let (start, end, point) = (Vec2::from(start), Vec2::from(end), Vec2::from(point));
    let edge = end - start;
    let offset = point - start;
    let epsilon = 64.0 * f64::EPSILON * edge.length_squared().max(1.0);
    edge.cross(offset).abs() <= epsilon
        && point.x >= start.x.min(end.x) - epsilon
        && point.x <= start.x.max(end.x) + epsilon
        && point.y >= start.y.min(end.y) - epsilon
        && point.y <= start.y.max(end.y) + epsilon
}

fn root_of(mut index: usize, parent: &[Option<usize>]) -> usize {
    while let Some(next) = parent[index] {
        index = next;
    }
    index
}

fn triangulation_matches(
    points: &[[f64; 2]],
    triangles: &[[usize; 3]],
    expected: f64,
) -> bool {
    if triangles.is_empty() || !expected.is_finite() || expected <= 0.0 {
        return false;
    }
    let mut area = 0.0;
    for triangle in triangles {
        let Some((&a, &b, &c)) = points
            .get(triangle[0])
            .zip(points.get(triangle[1]))
            .zip(points.get(triangle[2]))
            .map(|((a, b), c)| (a, b, c))
        else {
            return false;
        };
        let twice = (Vec2::from(b) - Vec2::from(a)).cross(Vec2::from(c) - Vec2::from(a));
        if !twice.is_finite() || twice <= 0.0 {
            return false;
        }
        area += twice * 0.5;
    }
    (area - expected).abs() <= expected.max(1.0) * 1.0e-9
}

/// Triangles filling `outer`, with `holes` removed.
///
/// Each triangle is three indices into a single point list, which is returned
/// alongside: the outer ring first, then each hole in turn. A caller mapping
/// the result somewhere else — onto a surface, into a vertex buffer — then
/// transforms the points once rather than once per triangle.
///
/// Rings need not be closed by repeating their first point, and their winding
/// does not matter: the outer is taken counter-clockwise and holes clockwise,
/// whichever way they arrive.
pub fn polygon(outer: &[[f64; 2]], holes: &[Vec<[f64; 2]>]) -> (Vec<[f64; 2]>, Vec<[usize; 3]>) {
    let mut points: Vec<Vec2> = orient(outer, true);
    if points.len() < 3 {
        return (Vec::new(), Vec::new());
    }
    let mut ring: Vec<usize> = (0..points.len()).collect();

    // Holes are bridged into the outer ring in order of how far right they
    // reach, so an inner hole is joined to the ring the outer one already
    // became rather than to the original.
    let mut pending: Vec<Vec<Vec2>> = holes
        .iter()
        .map(|hole| orient(hole, false))
        .filter(|hole| hole.len() >= 3)
        .collect();
    pending.sort_by(|a, b| rightmost(b).1.x.total_cmp(&rightmost(a).1.x));
    for hole in pending {
        bridge(&mut points, &mut ring, hole);
    }

    let triangles = clip_ears(&points, ring);
    (points.into_iter().map(Vec2::to_array).collect(), triangles)
}

/// A ring as points, wound the way asked for.
fn orient(ring: &[[f64; 2]], counter_clockwise: bool) -> Vec<Vec2> {
    let mut points: Vec<Vec2> = ring.iter().copied().map(Vec2::from).collect();
    // A ring given closed carries its first point twice, which every step
    // below would treat as a zero-length edge.
    if points.len() > 1 && points[0] == points[points.len() - 1] {
        points.pop();
    }
    if (signed_area(&points) > 0.0) != counter_clockwise {
        points.reverse();
    }
    points
}

fn signed_area(points: &[Vec2]) -> f64 {
    if points.len() < 3 {
        return 0.0;
    }
    let origin = points[0];
    (1..points.len() - 1)
        .map(|index| (points[index] - origin).cross(points[index + 1] - origin))
        .sum::<f64>()
        * 0.5
}

/// The index and position of a ring's rightmost point.
fn rightmost(ring: &[Vec2]) -> (usize, Vec2) {
    let mut best = 0;
    for (index, point) in ring.iter().enumerate() {
        if point.x > ring[best].x {
            best = index;
        }
    }
    (best, ring[best])
}

/// Joins a hole into the ring with a two-edge bridge.
///
/// The bridge runs from the hole's rightmost point to a vertex of the ring
/// that can see it. Rightmost because every other vertex of the hole is to
/// its left, so nothing of the hole itself is in the way.
///
/// Finding the far end is the part that has to be done properly. "The nearest
/// vertex nothing crosses" is not enough: with two holes it happily picks a
/// vertex of the other one and runs the bridge straight through it, crossing
/// no edge and enclosing the wrong region — which shows up as a ring with no
/// ear anywhere and no triangles at all.
///
/// So cast a ray to the right, insert its first crossing into the ring, and
/// bridge straight to that point. Giving each hole its own crossing also keeps
/// aligned holes from sharing a distant ring vertex and producing overlapping
/// bridge slits.
fn bridge(points: &mut Vec<Vec2>, ring: &mut Vec<usize>, hole: Vec<Vec2>) {
    let (start, from) = rightmost(&hole);
    let Some(at) = bridge_target(points, ring, from) else {
        return;
    };

    let base = points.len();
    points.extend(hole.iter().copied());

    // Out along the bridge, once round the hole, and back. The two coincident
    // edges are a slit of no width, which ear clipping then treats like any
    // other part of the ring.
    let mut spliced: Vec<usize> = Vec::with_capacity(ring.len() + hole.len() + 2);
    spliced.extend_from_slice(&ring[..=at]);
    for step in 0..hole.len() {
        spliced.push(base + (start + step) % hole.len());
    }
    spliced.push(base + start);
    spliced.push(ring[at]);
    spliced.extend_from_slice(&ring[at + 1..]);
    *ring = spliced;
}

/// Inserts the first point where a ray to the right meets the ring.
fn bridge_target(points: &mut Vec<Vec2>, ring: &mut Vec<usize>, from: Vec2) -> Option<usize> {
    let count = ring.len();
    let mut nearest = f64::INFINITY;
    let mut hit_edge = None;
    for index in 0..count {
        let next = (index + 1) % count;
        let (a, b) = (points[ring[index]], points[ring[next]]);
        // Only an edge straddling the ray's height can be hit, and one lying
        // along it cannot be hit at a single place.
        if (a.y > from.y) == (b.y > from.y) {
            continue;
        }
        let along = (from.y - a.y) / (b.y - a.y);
        let x = a.x + (b.x - a.x) * along;
        if x >= from.x && x < nearest {
            nearest = x;
            hit_edge = Some((index, next));
        }
    }
    let (first, second) = hit_edge?;
    let crossing = Vec2::new(nearest, from.y);
    if points[ring[first]] == crossing {
        return Some(first);
    }
    if points[ring[second]] == crossing {
        return Some(second);
    }
    let index = points.len();
    points.push(crossing);
    ring.insert(first + 1, index);
    Some(first + 1)
}

/// Cuts corners off until nothing is left.
fn clip_ears(points: &[Vec2], mut ring: Vec<usize>) -> Vec<[usize; 3]> {
    let mut out = Vec::with_capacity(ring.len().saturating_sub(2));
    let mut candidates = Vec::new();
    // Every ear removes one vertex, so the loop cannot run longer than the
    // ring — but a polygon with no ear at all (self-intersecting) would spin,
    // so the failures are counted rather than assumed away.
    let mut failures = 0;
    while ring.len() > 3 {
        if failures > ring.len() {
            // No ear anywhere: the ring crosses itself and there is no
            // triangulation to find.
            return Vec::new();
        }
        let count = ring.len();
        let bounds = ring.iter().fold(
            [[f64::INFINITY, f64::NEG_INFINITY]; 2],
            |mut bounds, index| {
                let point = points[*index];
                bounds[0][0] = bounds[0][0].min(point.x);
                bounds[0][1] = bounds[0][1].max(point.x);
                bounds[1][0] = bounds[1][0].min(point.y);
                bounds[1][1] = bounds[1][1].max(point.y);
                bounds
            },
        );
        let scale = [
            (bounds[0][1] - bounds[0][0]).max(f64::MIN_POSITIVE),
            (bounds[1][1] - bounds[1][0]).max(f64::MIN_POSITIVE),
        ];
        let cut = if count <= 4 {
            // Triangles and quads do not need a candidate allocation.
            (0..count)
                .filter(|at| is_ear(points, &ring, *at))
                .min_by(|a, b| {
                    ear_score(points, &ring, *a, scale)
                        .total_cmp(&ear_score(points, &ring, *b, scale))
                })
        } else {
            candidates.clear();
            candidates.extend(
                (0..count)
                    .filter(|&at| convex_corner(ear_corners(points, &ring, at)))
                    .map(|at| (at, ear_score(points, &ring, at, scale))),
            );
            let mut cut = None;
            while let Some(candidate_index) = (0..candidates.len()).min_by(|&a, &b| {
                // swap_remove changes storage order; ties still use ring order.
                candidates[a]
                    .1
                    .total_cmp(&candidates[b].1)
                    .then_with(|| candidates[a].0.cmp(&candidates[b].0))
            }) {
                let (at, _) = candidates.swap_remove(candidate_index);
                if is_ear(points, &ring, at) {
                    cut = Some(at);
                    break;
                }
            }
            cut
        };
        match cut {
            Some(at) => {
                let count = ring.len();
                out.push([
                    ring[(at + count - 1) % count],
                    ring[at],
                    ring[(at + 1) % count],
                ]);
                ring.remove(at);
                failures = 0;
            }
            None => failures += 1,
        }
    }
    if ring.len() == 3 {
        out.push([ring[0], ring[1], ring[2]]);
    }
    out
}

fn ear_score(points: &[Vec2], ring: &[usize], at: usize, scale: [f64; 2]) -> f64 {
    let corners = ear_corners(points, ring, at);
    (0..3)
        .map(|index| {
            let next = (index + 1) % 3;
            let dx = (corners[next].x - corners[index].x) / scale[0];
            let dy = (corners[next].y - corners[index].y) / scale[1];
            dx * dx + dy * dy
        })
        .fold(0.0, f64::max)
}

fn ear_corners(points: &[Vec2], ring: &[usize], at: usize) -> [Vec2; 3] {
    let count = ring.len();
    [
        points[ring[(at + count - 1) % count]],
        points[ring[at]],
        points[ring[(at + 1) % count]],
    ]
}

fn convex_corner([a, b, c]: [Vec2; 3]) -> bool {
    (b - a).cross(c - b) > 0.0
}

/// Whether the corner at `at` can be cut off.
fn is_ear(points: &[Vec2], ring: &[usize], at: usize) -> bool {
    let count = ring.len();
    let [a, b, c] = ear_corners(points, ring, at);
    // A reflex corner is not an ear, and neither is a collapsed one: cutting
    // either produces a triangle outside the polygon or none at all.
    if !convex_corner([a, b, c]) {
        return false;
    }
    // And nothing else may be inside the triangle, or the cut would swallow
    // part of the polygon.
    //
    // A vertex that *is* one of the corners is skipped by position and by
    // place. Bridging a hole leaves the ring visiting two points twice, and
    // those copies sit exactly on the triangle's edges — counted as inside,
    // they reject every candidate and nothing is ever an ear.
    (0..count).all(|other| {
        if other == at || other == (at + count - 1) % count || other == (at + 1) % count {
            return true;
        }
        let point = points[ring[other]];
        if point == a || point == b || point == c {
            return true;
        }
        !inside(a, b, c, point)
    })
}

/// Whether a point is within a triangle, edges included.
fn inside(a: Vec2, b: Vec2, c: Vec2, point: Vec2) -> bool {
    let side = |p: Vec2, q: Vec2| (q - p).cross(point - p);
    side(a, b) >= 0.0 && side(b, c) >= 0.0 && side(c, a) >= 0.0
}

#[cfg(test)]
mod tests {
    use super::*;

    fn area(points: &[[f64; 2]], triangles: &[[usize; 3]]) -> f64 {
        triangles
            .iter()
            .map(|triangle| {
                let a = Vec2::from(points[triangle[0]]);
                let b = Vec2::from(points[triangle[1]]);
                let c = Vec2::from(points[triangle[2]]);
                (b - a).cross(c - a).abs() * 0.5
            })
            .sum()
    }

    fn square(size: f64) -> Vec<[f64; 2]> {
        vec![[0.0, 0.0], [size, 0.0], [size, size], [0.0, size]]
    }

    #[test]
    fn a_square_becomes_two_triangles_covering_it() {
        let (points, triangles) = polygon(&square(10.0), &[]);
        assert_eq!(triangles.len(), 2);
        assert!((area(&points, &triangles) - 100.0).abs() < 1e-9);
    }

    #[test]
    fn equal_scores_keep_the_first_valid_ear() {
        let points: Vec<Vec2> = square(10.0).into_iter().map(Vec2::from).collect();
        assert_eq!(
            clip_ears(&points, vec![0, 1, 2, 3]),
            vec![[3, 0, 1], [1, 2, 3]]
        );
        // Check the complete output, including the final triangle/quad scan.
        let corners = square(10.0);
        let points: Vec<Vec2> = (0..4)
            .flat_map(|side| {
                let a = corners[side];
                let b = corners[(side + 1) % 4];
                (0..5).map(move |i| {
                    Vec2::from([
                        a[0] + (b[0] - a[0]) * i as f64 / 5.0,
                        a[1] + (b[1] - a[1]) * i as f64 / 5.0,
                    ])
                })
            })
            .collect();
        assert_eq!(
            clip_ears(&points, (0..20).collect()),
            [
                [19, 0, 1],
                [4, 5, 6],
                [9, 10, 11],
                [14, 15, 16],
                [19, 1, 2],
                [3, 4, 6],
                [8, 9, 11],
                [13, 14, 16],
                [3, 6, 7],
                [8, 11, 12],
                [13, 16, 17],
                [18, 19, 2],
                [18, 2, 3],
                [3, 7, 8],
                [8, 12, 13],
                [13, 17, 18],
                [18, 3, 8],
                [8, 13, 18],
            ]
        );
    }

    #[test]
    fn winding_does_not_matter() {
        let mut backwards = square(10.0);
        backwards.reverse();
        let (points, triangles) = polygon(&backwards, &[]);
        assert!((area(&points, &triangles) - 100.0).abs() < 1e-9);
    }

    #[test]
    fn a_ring_closed_by_repeating_its_first_point_is_not_counted_twice() {
        let mut closed = square(10.0);
        closed.push(closed[0]);
        let (points, triangles) = polygon(&closed, &[]);
        assert_eq!(triangles.len(), 2, "a repeated point is not a vertex");
        assert!((area(&points, &triangles) - 100.0).abs() < 1e-9);
    }

    #[test]
    fn a_concave_polygon_is_filled_without_leaving_its_outline() {
        // An L, whose reflex corner is not an ear and must not be cut.
        let shape = vec![
            [0.0, 0.0],
            [10.0, 0.0],
            [10.0, 4.0],
            [4.0, 4.0],
            [4.0, 10.0],
            [0.0, 10.0],
        ];
        let (points, triangles) = polygon(&shape, &[]);
        assert_eq!(triangles.len(), 4, "six vertices, four triangles");
        assert!((area(&points, &triangles) - 64.0).abs() < 1e-9);
    }

    #[test]
    fn a_hole_is_left_empty() {
        let hole = vec![[3.0, 3.0], [7.0, 3.0], [7.0, 7.0], [3.0, 7.0]];
        let (points, triangles) = polygon(&square(10.0), &[hole]);
        assert!(!triangles.is_empty());
        // A hundred less the sixteen the hole takes out.
        assert!(
            (area(&points, &triangles) - 84.0).abs() < 1e-9,
            "{}",
            area(&points, &triangles)
        );
    }

    #[test]
    fn two_holes_are_both_left_empty() {
        let holes = vec![
            vec![[1.0, 1.0], [3.0, 1.0], [3.0, 3.0], [1.0, 3.0]],
            vec![[6.0, 6.0], [9.0, 6.0], [9.0, 9.0], [6.0, 9.0]],
        ];
        let (points, triangles) = polygon(&square(10.0), &holes);
        assert!((area(&points, &triangles) - (100.0 - 4.0 - 9.0)).abs() < 1e-9);
    }

    #[test]
    fn two_aligned_holes_fit_inside_a_narrow_concave_arm() {
        let outer = vec![
            [0.0, 0.0],
            [12.0, 0.0],
            [12.0, 8.0],
            [11.0, 8.0],
            [11.0, 2.0],
            [2.0, 2.0],
            [1.8, 2.1],
            [1.8, 12.0],
            [0.0, 12.0],
        ];
        let circle = |centre: [f64; 2]| {
            (0..24)
                .map(|step| {
                    let angle = std::f64::consts::TAU * step as f64 / 24.0;
                    [centre[0] + 0.08 * angle.cos(), centre[1] + 0.08 * angle.sin()]
                })
                .collect::<Vec<_>>()
        };
        let holes = vec![circle([1.68, 6.0]), circle([1.68, 9.0])];
        let expected = signed_area_arrays(&outer).abs()
            - holes
                .iter()
                .map(|hole| signed_area_arrays(hole).abs())
                .sum::<f64>();

        let (points, triangles) = polygon(&outer, &holes);

        assert!(!triangles.is_empty());
        assert!((area(&points, &triangles) - expected).abs() < 1e-9);
    }

    #[test]
    fn every_triangle_stays_inside_the_polygon() {
        // The property area alone would not catch: a triangulation can have
        // the right total and still put a triangle outside and another twice
        // over.
        let shape = vec![
            [0.0, 0.0],
            [10.0, 0.0],
            [10.0, 4.0],
            [4.0, 4.0],
            [4.0, 10.0],
            [0.0, 10.0],
        ];
        let (points, triangles) = polygon(&shape, &[]);
        for triangle in &triangles {
            let centre = (Vec2::from(points[triangle[0]])
                + Vec2::from(points[triangle[1]])
                + Vec2::from(points[triangle[2]]))
                / 3.0;
            let inside_l = (centre.x <= 10.0 && centre.y <= 4.0)
                || (centre.x <= 4.0 && centre.y <= 10.0);
            assert!(inside_l && centre.x >= 0.0 && centre.y >= 0.0, "{centre:?}");
        }
    }

    #[test]
    fn a_self_crossing_ring_terminates_rather_than_spinning() {
        // A bowtie has no inside, so no triangulation of it is right. What
        // matters is that ear clipping stops looking rather than searching a
        // ring it can never reduce — the loop counts its failures for this.
        let bowtie = vec![[0.0, 0.0], [10.0, 10.0], [10.0, 0.0], [0.0, 10.0]];
        let (points, triangles) = polygon(&bowtie, &[]);
        for triangle in &triangles {
            let a = Vec2::from(points[triangle[0]]);
            let b = Vec2::from(points[triangle[1]]);
            let c = Vec2::from(points[triangle[2]]);
            assert!((b - a).cross(c - a).abs() > 0.0, "a collapsed triangle");
        }
    }

    #[test]
    fn too_few_points_is_no_polygon() {
        assert_eq!(polygon(&[], &[]).1.len(), 0);
        assert_eq!(polygon(&[[0.0, 0.0], [1.0, 0.0]], &[]).1.len(), 0);
    }

    #[test]
    fn a_polygon_at_survey_coordinates_still_covers_itself() {
        let origin = [512_345.678, 4_512_345.678];
        let shifted: Vec<[f64; 2]> = square(10.0)
            .iter()
            .map(|p| [origin[0] + p[0], origin[1] + p[1]])
            .collect();
        let (points, triangles) = polygon(&shifted, &[]);
        assert!((area(&points, &triangles) - 100.0).abs() < 1e-6);
    }

    #[test]
    fn a_many_sided_ring_is_fully_triangulated() {
        // A circle's worth of vertices, which is what a curved face's
        // boundary comes in as.
        let ring: Vec<[f64; 2]> = (0..64)
            .map(|step| {
                let angle = std::f64::consts::TAU * step as f64 / 64.0;
                [10.0 * angle.cos(), 10.0 * angle.sin()]
            })
            .collect();
        let (points, triangles) = polygon(&ring, &[]);
        assert_eq!(triangles.len(), 62, "n − 2 triangles");
        let expected = 0.5 * 64.0 * 100.0 * (std::f64::consts::TAU / 64.0).sin();
        assert!((area(&points, &triangles) - expected).abs() < 1e-6);
    }
}
