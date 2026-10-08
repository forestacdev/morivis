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

// An open, shallow lens on a planar NURBS patch; neither edge needs angular subdivision.
pub fn shallow_lens() -> Body {
    use opencadkernel::{
        brep::{
            geometry::Curve3,
            topology::{Coedge, Edge, Face, Loop, Lump, Shell, Vertex},
            Provenance,
        },
        space::NurbsCurve3,
    };
    let mut body = Body::new();
    let lump = body.lumps.insert(Lump {
        shells: vec![],
        provenance: Provenance::Synthesized,
    });
    body.roots.push(lump);
    let shell = body.shells.insert(Shell {
        faces: vec![],
        owner: lump,
        provenance: Provenance::Synthesized,
    });
    body.lumps.get_mut(lump).unwrap().shells.push(shell);
    let surface = body.surfaces.insert(Surface::Nurbs(
        NurbsSurface3::new(
            1,
            1,
            vec![
                vec![[0., -1., 0.], [0., 1., 0.]],
                vec![[4., -1., 0.], [4., 1., 0.]],
            ],
            vec![],
            vec![],
            None,
        )
        .unwrap(),
    ));
    let face = body.faces.insert(Face {
        surface,
        forward: true,
        loops: vec![],
        owner: shell,
        provenance: Provenance::Synthesized,
    });
    body.shells.get_mut(shell).unwrap().faces.push(face);
    let ring = body.loops.insert(Loop {
        coedges: vec![],
        owner: face,
        provenance: Provenance::Synthesized,
    });
    body.faces.get_mut(face).unwrap().loops.push(ring);
    let start = body.vertices.insert(Vertex {
        point: [0., 0., 0.],
        provenance: Provenance::Synthesized,
    });
    let end = body.vertices.insert(Vertex {
        point: [4., 0., 0.],
        provenance: Provenance::Synthesized,
    });
    for (height, forward) in [(-0.001, true), (0.001, false)] {
        let curve = body.curves.insert(Curve3::Nurbs(
            NurbsCurve3::new(
                2,
                vec![[0., 0., 0.], [2., height, 0.], [4., 0., 0.]],
                vec![],
                None,
            )
            .unwrap(),
        ));
        let edge = body.edges.insert(Edge {
            curve,
            start_parameter: 0.,
            end_parameter: 1.,
            start,
            end,
            coedges: vec![],
            provenance: Provenance::Synthesized,
        });
        let coedge = body.coedges.insert(Coedge {
            edge,
            forward,
            pcurve: None,
            owner: ring,
            provenance: Provenance::Synthesized,
        });
        body.edges.get_mut(edge).unwrap().coedges.push(coedge);
        body.loops.get_mut(ring).unwrap().coedges.push(coedge);
    }
    body
}

// A box with one missing planar face and a boundary schedule containing repeated samples.
#[cfg(test)]
pub fn box_with_repeated_edge_samples() -> (Body, opencadkernel::brep::mesh::BodyMesh) {
    use opencadkernel::brep::mesh::{tessellate, TessellationTolerance};
    let body = cuboid([0.; 3], [2., 3., 4.]).unwrap();
    let key = body.face_keys().next().unwrap();
    let mut mesh = tessellate(&body, TessellationTolerance::new(0.15, 1e-6));
    mesh.mesh.triangles = mesh
        .mesh
        .triangles
        .iter()
        .zip(&mesh.triangle_faces)
        .filter_map(|(triangle, face)| (*face != key).then_some(*triangle))
        .collect();
    mesh.triangle_faces.retain(|face| *face != key);
    mesh.missing_faces.push(key);
    for edge in &mut mesh.drawing_edges {
        let start = edge.positions[0];
        for _ in 0..4 {
            edge.positions.insert(0, start);
        }
    }
    (body, mesh)
}

// A fictional thin circular band whose independently sampled arcs can cross as chords.
pub fn curved_band() -> Body {
    use opencadkernel::{
        brep::{
            geometry::{Circle3, Curve3, Line3},
            topology::{Coedge, Edge, Face, Loop, Lump, Shell, Vertex},
            Provenance,
        },
        space::Plane,
    };
    let mut body = Body::new();
    let lump = body.lumps.insert(Lump {
        shells: vec![],
        provenance: Provenance::Synthesized,
    });
    body.roots.push(lump);
    let shell = body.shells.insert(Shell {
        faces: vec![],
        owner: lump,
        provenance: Provenance::Synthesized,
    });
    body.lumps.get_mut(lump).unwrap().shells.push(shell);
    let surface = body.surfaces.insert(Surface::Plane(Plane::XY));
    let face = body.faces.insert(Face {
        surface,
        forward: true,
        loops: vec![],
        owner: shell,
        provenance: Provenance::Synthesized,
    });
    body.shells.get_mut(shell).unwrap().faces.push(face);
    let ring = body.loops.insert(Loop {
        coedges: vec![],
        owner: face,
        provenance: Provenance::Synthesized,
    });
    body.faces.get_mut(face).unwrap().loops.push(ring);
    let outer = Curve3::Circle(Circle3 {
        plane: Plane::XY,
        radius: 1.0002,
    });
    let inner = Curve3::Circle(Circle3 {
        plane: Plane::XY,
        radius: 1.,
    });
    let pi = std::f64::consts::PI;
    let points = [
        outer.point_at(0.),
        outer.point_at(pi),
        inner.point_at(pi - 0.07),
        inner.point_at(0.07),
    ];
    let vertices = points.map(|point| {
        body.vertices.insert(Vertex {
            point,
            provenance: Provenance::Synthesized,
        })
    });
    let line = |a: usize, b: usize| {
        Curve3::Line(Line3 {
            origin: points[a],
            direction: std::array::from_fn(|i| points[b][i] - points[a][i]),
        })
    };
    let curves = [
        (outer, 0., pi, true),
        (line(1, 2), 0., 1., true),
        (inner, 0.07, pi - 0.07, false),
        (line(3, 0), 0., 1., true),
    ];
    for (i, (curve, start_parameter, end_parameter, forward)) in curves.into_iter().enumerate() {
        let curve = body.curves.insert(curve);
        let (start, end) = if forward {
            (vertices[i], vertices[(i + 1) % 4])
        } else {
            (vertices[(i + 1) % 4], vertices[i])
        };
        let edge = body.edges.insert(Edge {
            curve,
            start_parameter,
            end_parameter,
            start,
            end,
            coedges: vec![],
            provenance: Provenance::Synthesized,
        });
        let coedge = body.coedges.insert(Coedge {
            edge,
            forward,
            pcurve: None,
            owner: ring,
            provenance: Provenance::Synthesized,
        });
        body.edges.get_mut(edge).unwrap().coedges.push(coedge);
        body.loops.get_mut(ring).unwrap().coedges.push(coedge);
    }
    body
}

// Open surface patches with explicit 3D boundary curves and no 2D trim hints.
fn bounded_patch(
    surface: Surface,
    edges: Vec<(opencadkernel::brep::geometry::Curve3, f64, f64, bool)>,
) -> Body {
    use opencadkernel::brep::{
        topology::{Coedge, Edge, Face, Loop, Lump, Shell, Vertex},
        Provenance,
    };
    let mut body = Body::new();
    let lump = body.lumps.insert(Lump {
        shells: vec![],
        provenance: Provenance::Synthesized,
    });
    body.roots.push(lump);
    let shell = body.shells.insert(Shell {
        faces: vec![],
        owner: lump,
        provenance: Provenance::Synthesized,
    });
    body.lumps.get_mut(lump).unwrap().shells.push(shell);
    let surface = body.surfaces.insert(surface);
    let face = body.faces.insert(Face {
        surface,
        forward: true,
        loops: vec![],
        owner: shell,
        provenance: Provenance::Synthesized,
    });
    body.shells.get_mut(shell).unwrap().faces.push(face);
    let ring = body.loops.insert(Loop {
        coedges: vec![],
        owner: face,
        provenance: Provenance::Synthesized,
    });
    body.faces.get_mut(face).unwrap().loops.push(ring);
    let vertices: Vec<_> = edges
        .iter()
        .map(|(curve, a, b, forward)| {
            let point = curve.point_at(if *forward { *a } else { *b });
            let existing = body.vertices.iter().find_map(|(key, v)| {
                (opencadkernel::space::Vec3::from(v.point)
                    .distance(opencadkernel::space::Vec3::from(point))
                    < 1e-9)
                    .then_some(key)
            });
            existing.unwrap_or_else(|| {
                body.vertices.insert(Vertex {
                    point,
                    provenance: Provenance::Synthesized,
                })
            })
        })
        .collect();
    for (i, (curve, start_parameter, end_parameter, forward)) in edges.into_iter().enumerate() {
        let (start, end) = (vertices[i], vertices[(i + 1) % vertices.len()]);
        let (start, end) = if forward { (start, end) } else { (end, start) };
        let curve = body.curves.insert(curve);
        let edge = body.edges.insert(Edge {
            curve,
            start_parameter,
            end_parameter,
            start,
            end,
            coedges: vec![],
            provenance: Provenance::Synthesized,
        });
        let coedge = body.coedges.insert(Coedge {
            edge,
            forward,
            pcurve: None,
            owner: ring,
            provenance: Provenance::Synthesized,
        });
        body.edges.get_mut(edge).unwrap().coedges.push(coedge);
        body.loops.get_mut(ring).unwrap().coedges.push(coedge);
    }
    body
}

pub fn horn_patch(origin: [f64; 3]) -> Body {
    use opencadkernel::{
        brep::geometry::{Circle3, Curve3, Torus},
        space::Plane,
    };
    use std::f64::consts::{FRAC_PI_2, PI};
    let frame = Plane {
        origin,
        ..Plane::XY
    };
    let radius = 0.25;
    let (u0, u1): (f64, f64) = (0.3, 1.4);
    let meridian = |u: f64| {
        Curve3::Circle(Circle3 {
            plane: Plane {
                origin: frame.point_at([radius * u.cos(), radius * u.sin()]),
                x_axis: [u.cos(), u.sin(), 0.],
                y_axis: [0., 0., 1.],
            },
            radius,
        })
    };
    let bottom = Curve3::Circle(Circle3 {
        plane: Plane {
            origin: [origin[0], origin[1], origin[2] - radius],
            ..frame
        },
        radius,
    });
    bounded_patch(
        Surface::Torus(Torus {
            frame,
            major_radius: radius,
            minor_radius: radius,
        }),
        vec![
            (meridian(u0), -PI, -FRAC_PI_2, true),
            (bottom, u0, u1, true),
            (meridian(u1), -PI, -FRAC_PI_2, false),
        ],
    )
}

pub fn planar_slit(width: f64) -> Body {
    use opencadkernel::{
        brep::geometry::{Curve3, Line3},
        space::Plane,
    };
    let points = [
        [0., 0., 0.],
        [4., 0., 0.],
        [4., 3., 0.],
        [4.5, 3. - width, 0.],
        [0., 3., 0.],
    ];
    let edges = (0..points.len())
        .map(|i| {
            let a = points[i];
            let b = points[(i + 1) % points.len()];
            (
                Curve3::Line(Line3 {
                    origin: a,
                    direction: std::array::from_fn(|axis| b[axis] - a[axis]),
                }),
                0.,
                1.,
                true,
            )
        })
        .collect();
    bounded_patch(Surface::Plane(Plane::XY), edges)
}

pub fn bent_tube() -> Body {
    use opencadkernel::{
        brep::geometry::{Circle3, Curve3},
        space::{NurbsSurface3, Plane},
    };
    let circle = [
        [1., 0.],
        [1., 1.],
        [0., 1.],
        [-1., 1.],
        [-1., 0.],
        [-1., -1.],
        [0., -1.],
        [1., -1.],
        [1., 0.],
    ];
    let centres = [[0., 0., 0.], [0., 0., 1.], [1., 0., 2.], [2., 0., 3.]];
    let control = circle
        .iter()
        .map(|p| {
            centres
                .iter()
                .map(|c| [c[0] + 0.4 * p[0], c[1] + 0.4 * p[1], c[2]])
                .collect()
        })
        .collect();
    let weights = (0..9)
        .map(|i| {
            vec![
                if i % 2 == 0 {
                    1.
                } else {
                    std::f64::consts::FRAC_1_SQRT_2
                };
                4
            ]
        })
        .collect();
    let nurbs = NurbsSurface3::new(
        2,
        3,
        control,
        vec![0., 0., 0., 1., 1., 2., 2., 3., 3., 4., 4., 4.],
        vec![0., 0., 0., 0., 1., 1., 1., 1.],
        Some(weights),
    )
    .unwrap();
    let seam = Curve3::Nurbs(nurbs.isocurve(0, 0.).unwrap());
    let circle_at = |origin| {
        Curve3::Circle(Circle3 {
            plane: Plane {
                origin,
                ..Plane::XY
            },
            radius: 0.4,
        })
    };
    let mut body = bounded_patch(
        Surface::Nurbs(nurbs),
        vec![
            (circle_at(centres[0]), 0., std::f64::consts::TAU, true),
            (seam.clone(), 0., 1., true),
            (circle_at(centres[3]), 0., std::f64::consts::TAU, false),
            (seam, 0., 1., false),
        ],
    );
    let face = body.face_keys().next().unwrap();
    let coedges = body.face_coedges(face);
    let shared = body.coedges.get(coedges[1]).unwrap().edge;
    let unused = body.coedges.get(coedges[3]).unwrap().edge;
    body.coedges.get_mut(coedges[3]).unwrap().edge = shared;
    body.edges.get_mut(shared).unwrap().coedges.push(coedges[3]);
    body.edges.remove(unused);
    for (i, v) in [(0, 0.), (2, 1.)] {
        body.coedges.get_mut(coedges[i]).unwrap().pcurve = Some(Curve::Line(Line {
            start: [0., v],
            end: [4., v],
        }));
    }
    body
}

// Fictional curved bow tie: two lobes whose combined exact area is 20/3.
pub fn crossing_curved_patch() -> Body {
    use opencadkernel::{
        brep::geometry::{Curve3, Line3},
        space::{NurbsCurve3, Plane},
    };
    let a = [-2., -1., 0.];
    let b = [2., 1., 0.];
    let c = [-2., 1., 0.];
    let d = [2., -1., 0.];
    let line = |a: [f64; 3], b: [f64; 3]| {
        Curve3::Line(Line3 {
            origin: a,
            direction: [b[0] - a[0], b[1] - a[1], 0.],
        })
    };
    let arc = |a, b, c| {
        Curve3::Nurbs(
            NurbsCurve3::new(2, vec![a, b, c], vec![0., 0., 0., 1., 1., 1.], None).unwrap(),
        )
    };
    bounded_patch(
        Surface::Plane(Plane::XY),
        vec![
            (line(a, b), 0., 1., true),
            (arc(b, [0., 2., 0.], c), 0., 1., true),
            (line(c, d), 0., 1., true),
            (arc(d, [0., -2., 0.], a), 0., 1., true),
        ],
    )
}

// A collapsed trim, bounded by the same tiny spline in opposite directions.
pub fn collapsed_nurbs_slit(size: f64, periodic: bool) -> Body {
    use opencadkernel::{brep::geometry::Curve3, space::NurbsCurve3};
    let surface = NurbsSurface3::new(
        1,
        1,
        vec![
            vec![[0., 0., 0.], [0., 1., 0.]],
            vec![[1., 0., 0.], [1., 1., 0.]],
        ],
        vec![0., 0., 1., 1.],
        vec![0., 0., 1., 1.],
        None,
    )
    .unwrap()
    .with_periodicity(periodic, false);
    let curve = Curve3::Nurbs(
        NurbsCurve3::new(
            2,
            vec![[0., 0., 0.], [size, size, 0.], [0., 0., 0.]],
            vec![0., 0., 0., 1., 1., 1.],
            None,
        )
        .unwrap(),
    );
    let mut body = bounded_patch(
        Surface::Nurbs(surface),
        vec![(curve.clone(), 0., 1., true), (curve, 0., 1., false)],
    );
    let face = body.face_keys().next().unwrap();
    let coedges = body.face_coedges(face);
    let edge = body.coedges.get(coedges[0]).unwrap().edge;
    let unused = body.coedges.get(coedges[1]).unwrap().edge;
    body.coedges.get_mut(coedges[1]).unwrap().edge = edge;
    body.edges.get_mut(edge).unwrap().coedges.push(coedges[1]);
    body.edges.remove(unused);
    body
}
