//! Whether two faces come near each other, judged on their meshes.
//!
//! The closed-form intersections in [`intersect`](super::intersect) say
//! `Unknown` for most pairs of curved surfaces at an angle. Most such pairs in
//! an assembly never touch at all — a hub's fillet and a shaft's chamfer whose
//! boxes overlap but whose surfaces stay millimetres apart. Their meshes,
//! each within a measured distance of its true surface, prove that cheaply:
//! two triangle sets further apart than both deviations together cannot hide
//! a meeting of the surfaces they approximate.

use super::mesh::{tessellate, TessellationTolerance};
use super::topology::{Body, FaceKey};
use crate::space::Vec3;
use std::collections::HashMap;

/// A body's faces as triangles, with how far its mesh strays from its
/// surfaces.
pub(super) struct FaceSoups {
    by_face: HashMap<FaceKey, Vec<[Vec3; 3]>>,
    deviation: f64,
}

impl FaceSoups {
    pub(super) fn of(body: &Body, tolerance: f64) -> Self {
        let mesh = tessellate(body, TessellationTolerance::new(0.1, tolerance.max(1e-9)));
        let mut by_face: HashMap<FaceKey, Vec<[Vec3; 3]>> = HashMap::new();
        let mut deviation = 0.0_f64;
        for (triangle, face) in mesh.mesh.triangles.iter().zip(&mesh.triangle_faces) {
            let corners = triangle.map(|index| Vec3::from(mesh.mesh.positions[index]));
            if let Some(surface) = body
                .faces
                .get(*face)
                .and_then(|node| body.surfaces.get(node.surface))
            {
                let centre = (corners[0] + corners[1] + corners[2]) * (1.0 / 3.0);
                let gap = surface.distance_to(centre.to_array()).abs();
                if gap.is_finite() {
                    deviation = deviation.max(gap);
                }
            }
            by_face.entry(*face).or_default().push(corners);
        }
        // A face the mesh could not draw has no soup: nothing can be proved
        // about it, and `apart` says so.
        let _ = mesh.missing_faces;
        Self { by_face, deviation }
    }

    pub(super) fn triangles(&self, face: FaceKey) -> Option<&[[Vec3; 3]]> {
        self.by_face.get(&face).map(Vec::as_slice)
    }
}

/// Whether two faces stay apart by more than both meshes' deviations and
/// `tolerance`. `false` whenever it cannot be shown — a face with no mesh,
/// or triangles that come that close.
pub(super) fn apart(
    one: &FaceSoups,
    face: FaceKey,
    other: &FaceSoups,
    other_face: FaceKey,
    tolerance: f64,
) -> bool {
    let (Some(first), Some(second)) = (one.by_face.get(&face), other.by_face.get(&other_face))
    else {
        return false;
    };
    // A centroid sample can miss the worst of a patch's bulge; twice the
    // measured deviation covers it.
    let margin = 2.0 * (one.deviation + other.deviation) + tolerance;
    let boxes = |triangles: &[[Vec3; 3]]| -> Vec<(Vec3, Vec3)> {
        triangles
            .iter()
            .map(|t| (lowest(lowest(t[0], t[1]), t[2]), highest(highest(t[0], t[1]), t[2])))
            .collect()
    };
    let (first_boxes, second_boxes) = (boxes(first), boxes(second));
    // Sweep along x: each triangle of the second set meets only the first
    // set's triangles whose x ranges come within the margin.
    let mut order: Vec<usize> = (0..first.len()).collect();
    order.sort_by(|a, b| first_boxes[*a].0.x.total_cmp(&first_boxes[*b].0.x));
    for (index, triangle) in second.iter().enumerate() {
        let (low, high) = second_boxes[index];
        for &candidate in &order {
            let (candidate_low, candidate_high) = first_boxes[candidate];
            if candidate_low.x > high.x + margin {
                break;
            }
            if candidate_high.x < low.x - margin
                || candidate_low.y > high.y + margin
                || candidate_high.y < low.y - margin
                || candidate_low.z > high.z + margin
                || candidate_high.z < low.z - margin
            {
                continue;
            }
            if triangle_distance(&first[candidate], triangle) <= margin {
                return false;
            }
        }
    }
    true
}

/// Least distance between two triangles; zero where they cross.
fn triangle_distance(a: &[Vec3; 3], b: &[Vec3; 3]) -> f64 {
    let edges = |t: &[Vec3; 3]| [(t[0], t[1]), (t[1], t[2]), (t[2], t[0])];
    for (p, q) in edges(a) {
        if segment_crosses_triangle(p, q, b) {
            return 0.0;
        }
    }
    for (p, q) in edges(b) {
        if segment_crosses_triangle(p, q, a) {
            return 0.0;
        }
    }
    let mut best = f64::INFINITY;
    for point in a {
        best = best.min(point.distance(closest_on_triangle(*point, b)));
    }
    for point in b {
        best = best.min(point.distance(closest_on_triangle(*point, a)));
    }
    for (p, q) in edges(a) {
        for (r, s) in edges(b) {
            best = best.min(segment_distance(p, q, r, s));
        }
    }
    best
}

fn segment_crosses_triangle(p: Vec3, q: Vec3, t: &[Vec3; 3]) -> bool {
    let normal = (t[1] - t[0]).cross(t[2] - t[0]);
    let (dp, dq) = ((p - t[0]).dot(normal), (q - t[0]).dot(normal));
    if dp * dq > 0.0 || dp == dq {
        return false;
    }
    let point = p + (q - p) * (dp / (dp - dq));
    let inside = |a: Vec3, b: Vec3| (b - a).cross(point - a).dot(normal) >= 0.0;
    inside(t[0], t[1]) && inside(t[1], t[2]) && inside(t[2], t[0])
}

/// The point of triangle `t` nearest `point`.
pub(crate) fn closest_on_triangle(point: Vec3, t: &[Vec3; 3]) -> Vec3 {
    let (a, b, c) = (t[0], t[1], t[2]);
    let (ab, ac, ap) = (b - a, c - a, point - a);
    let (d1, d2) = (ab.dot(ap), ac.dot(ap));
    if d1 <= 0.0 && d2 <= 0.0 {
        return a;
    }
    let bp = point - b;
    let (d3, d4) = (ab.dot(bp), ac.dot(bp));
    if d3 >= 0.0 && d4 <= d3 {
        return b;
    }
    let vc = d1 * d4 - d3 * d2;
    if vc <= 0.0 && d1 >= 0.0 && d3 <= 0.0 {
        return a + ab * (d1 / (d1 - d3));
    }
    let cp = point - c;
    let (d5, d6) = (ab.dot(cp), ac.dot(cp));
    if d6 >= 0.0 && d5 <= d6 {
        return c;
    }
    let vb = d5 * d2 - d1 * d6;
    if vb <= 0.0 && d2 >= 0.0 && d6 <= 0.0 {
        return a + ac * (d2 / (d2 - d6));
    }
    let va = d3 * d6 - d5 * d4;
    if va <= 0.0 && d4 - d3 >= 0.0 && d5 - d6 >= 0.0 {
        return b + (c - b) * ((d4 - d3) / ((d4 - d3) + (d5 - d6)));
    }
    let denominator = 1.0 / (va + vb + vc);
    a + ab * (vb * denominator) + ac * (vc * denominator)
}

/// Least distance between segments `pq` and `rs`.
fn segment_distance(p: Vec3, q: Vec3, r: Vec3, s: Vec3) -> f64 {
    let (d1, d2, gap) = (q - p, s - r, p - r);
    let (a, e, f) = (d1.dot(d1), d2.dot(d2), d2.dot(gap));
    let (mut u, mut v);
    if a <= f64::EPSILON && e <= f64::EPSILON {
        return p.distance(r);
    }
    if a <= f64::EPSILON {
        u = 0.0;
        v = (f / e).clamp(0.0, 1.0);
    } else {
        let c = d1.dot(gap);
        if e <= f64::EPSILON {
            v = 0.0;
            u = (-c / a).clamp(0.0, 1.0);
        } else {
            let b = d1.dot(d2);
            let denominator = a * e - b * b;
            u = if denominator > 0.0 {
                ((b * f - c * e) / denominator).clamp(0.0, 1.0)
            } else {
                0.0
            };
            v = (b * u + f) / e;
            if v < 0.0 {
                v = 0.0;
                u = (-c / a).clamp(0.0, 1.0);
            } else if v > 1.0 {
                v = 1.0;
                u = ((b - c) / a).clamp(0.0, 1.0);
            }
        }
    }
    (p + d1 * u).distance(r + d2 * v)
}

fn lowest(a: Vec3, b: Vec3) -> Vec3 {
    Vec3::new(a.x.min(b.x), a.y.min(b.y), a.z.min(b.z))
}

fn highest(a: Vec3, b: Vec3) -> Vec3 {
    Vec3::new(a.x.max(b.x), a.y.max(b.y), a.z.max(b.z))
}
