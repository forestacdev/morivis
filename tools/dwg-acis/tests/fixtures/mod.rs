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
