use opencadkernel::{
    brep::{geometry::Surface, make::cuboid, topology::Body},
    geom2d::{Curve, Line},
    space::NurbsSurface3,
};

// A fictional box with a planar NURBS face and slightly inconsistent trim coordinates.
pub fn trimmed_box(offset: f64) -> Body {
    let mut body = cuboid([0.0; 3], [2.0, 3.0, 4.0]).unwrap();
    let key = body.face_keys().next().unwrap();
    let surface_key = body.faces.get(key).unwrap().surface;
    let Surface::Plane(plane) = body.surfaces.get(surface_key).unwrap().clone() else {
        panic!()
    };
    let coedges: Vec<_> = body.face_coedges(key);
    let uv: Vec<_> = coedges
        .iter()
        .flat_map(|key| {
            let edge = body
                .edges
                .get(body.coedges.get(*key).unwrap().edge)
                .unwrap();
            [edge.start, edge.end].map(|vertex| {
                plane
                    .project(body.vertices.get(vertex).unwrap().point)
                    .unwrap()
            })
        })
        .collect();
    let bounds = [0, 1].map(|axis| {
        [
            uv.iter().map(|p| p[axis]).fold(f64::INFINITY, f64::min),
            uv.iter().map(|p| p[axis]).fold(f64::NEG_INFINITY, f64::max),
        ]
    });
    let control = (0..4)
        .map(|i| {
            (0..4)
                .map(|j| {
                    plane.point_at([
                        bounds[0][0] + (bounds[0][1] - bounds[0][0]) * i as f64 / 3.0,
                        bounds[1][0] + (bounds[1][1] - bounds[1][0]) * j as f64 / 3.0,
                    ])
                })
                .collect()
        })
        .collect();
    let surface = Surface::Nurbs(NurbsSurface3::new(3, 3, control, vec![], vec![], None).unwrap());
    for (index, key) in coedges.into_iter().enumerate() {
        let edge = body.edges.get(body.coedges.get(key).unwrap().edge).unwrap();
        let mut points = [edge.start, edge.end].map(|vertex| {
            let (u, v) = surface
                .parameters_at(body.vertices.get(vertex).unwrap().point)
                .unwrap();
            [u, v]
        });
        for point in &mut points {
            point[index % 2] += if index % 2 == 0 { offset } else { -offset };
        }
        body.coedges.get_mut(key).unwrap().pcurve = Some(Curve::Line(Line {
            start: points[0],
            end: points[1],
        }));
    }
    *body.surfaces.get_mut(surface_key).unwrap() = surface;
    body
}
