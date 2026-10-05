use opencadcodec::entities::{
    acis::{primitives, SatPointer, SatToken},
    Insert, Solid3D,
};
use opencadcodec::{
    BlockRecord, CadDocument, Color, DwgWriter, DxfVersion, EntityType, Layer, Line, Vector3,
};
use std::path::PathBuf;

#[path = "../../tests/fixtures/mod.rs"]
mod fixture_shapes;

fn write_trim_fixture(destination: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let body = fixture_shapes::trimmed_box(1e-7);
    let mut sat = opencadcodec::entities::acis::SatDocument::new();
    opencadkernel::acis::append(&body, &mut sat).expect("fictional trimmed box");
    let mut doc = CadDocument::new();
    doc.version = DxfVersion::AC1032;
    doc.header.insertion_units = 6;
    doc.layers.add(Layer::new("test-trim"))?;
    let mut solid = Solid3D::from_sat(&sat.to_sat_string());
    solid.common.layer = "test-trim".into();
    doc.add_entity(EntityType::Solid3D(solid))?;
    DwgWriter::write_to_file(destination.join("test-trimmed-solid.dwg"), &doc)?;
    let mut doc = CadDocument::new();
    doc.version = DxfVersion::AC1032;
    doc.header.insertion_units = 6;
    for layer in ["test-valid", "test-excluded"] {
        doc.layers.add(Layer::new(layer))?;
    }
    let mut good = Solid3D::from_sat(&primitives::build_box([0.; 3], 2., 3., 4.).to_sat_string());
    good.common.layer = "test-valid".into();
    doc.add_entity(EntityType::Solid3D(good))?;
    let mut bad = primitives::build_box([10.; 3], 2., 3., 4.);
    bad.records
        .iter_mut()
        .find(|r| r.entity_type == "plane-surface")
        .unwrap()
        .entity_type = "test-unsupported-surface".into();
    let mut excluded = Solid3D::from_sat(&bad.to_sat_string());
    excluded.common.layer = "test-excluded".into();
    doc.add_entity(EntityType::Solid3D(excluded))?;
    doc.add_entity(EntityType::Line(Line::from_coords(0., 0., 0., 2., 4., 0.)))?;
    DwgWriter::write_to_file(destination.join("test-partial-solids.dwg"), &doc)?;
    Ok(())
}

fn write_parallel_fixture(destination: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let mut doc = CadDocument::new();
    doc.header.insertion_units = 6;
    doc.layers.add(Layer::new("test-parallel"))?;
    for index in 0..8 {
        let sat = primitives::build_box([index as f64 * 5., 0., 0.], 2., 3., 4.);
        let mut solid = Solid3D::from_sat(&sat.to_sat_string());
        solid.common.layer = "test-parallel".into();
        doc.add_entity(EntityType::Solid3D(solid))?;
    }
    DwgWriter::write_to_file(destination.join("test-parallel-solids.dwg"), &doc)?;
    Ok(())
}

fn write_lens_fixture(destination: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let mut doc = CadDocument::new();
    doc.header.insertion_units = 6;
    let mut sat = opencadcodec::entities::acis::SatDocument::new();
    opencadkernel::acis::append(&fixture_shapes::shallow_lens(), &mut sat)
        .expect("fictional shallow lens");
    doc.add_entity(EntityType::Solid3D(Solid3D::from_sat(&sat.to_sat_string())))?;
    DwgWriter::write_to_file(destination.join("test-shallow-lens.dwg"), &doc)?;
    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let destination = PathBuf::from(std::env::args().nth(1).expect("fixture directory"));
    write_lens_fixture(&destination)?;
    if std::env::args().any(|argument| argument == "--lens-only") {
        return Ok(());
    }
    write_parallel_fixture(&destination)?;
    if std::env::args().any(|argument| argument == "--parallel-only") {
        return Ok(());
    }
    write_trim_fixture(&destination)?;
    if std::env::args().any(|argument| argument == "--regression-only") {
        return Ok(());
    }
    for (name, version) in [
        ("test-solids-sat.dwg", DxfVersion::AC1021),
        ("test-solids-sab.dwg", DxfVersion::AC1032),
    ] {
        let mut doc = CadDocument::new();
        doc.version = version;
        doc.header.insertion_units = 4;
        for (layer, color, sat) in [
            (
                "test-box",
                Color::RED,
                primitives::build_box([10., 20., 30.], 4., 6., 8.),
            ),
            (
                "test-cylinder",
                Color::GREEN,
                primitives::build_cylinder([30., 20., 10.], 3., 12.),
            ),
            (
                "test-sphere",
                Color::BLUE,
                primitives::build_sphere([50., 20., 10.], 5.),
            ),
        ] {
            doc.layers.add(Layer::new(layer))?;
            let mut solid = Solid3D::from_sat(&sat.to_sat_string());
            solid.common.layer = layer.into();
            solid.common.color = color;
            doc.add_entity(EntityType::Solid3D(solid))?;
        }
        doc.add_entity(EntityType::Line(Line::from_coords(0., 0., 0., 2., 4., 0.)))?;
        DwgWriter::write_to_file(destination.join(name), &doc)?;
        let bytes = std::fs::read(destination.join(name))?;
        match morivis_dwg_acis::read_drawing(&bytes, 250_000) {
            Ok(drawing) => println!(
                "{name}: {:?}",
                drawing
                    .solids
                    .iter()
                    .map(|s| (&s.layer, s.positions.len(), s.triangles.len()))
                    .collect::<Vec<_>>()
            ),
            Err(e) => println!("{name}: {e}"),
        }
    }
    let mut doc = CadDocument::new();
    doc.header.insertion_units = 6;
    let mut sat = primitives::build_box([0., 0., 0.], 4., 6., 8.);
    let face = sat
        .records
        .iter_mut()
        .find(|r| r.entity_type == "plane-surface")
        .unwrap();
    face.entity_type = "test-unsupported-surface".into();
    doc.add_entity(EntityType::Solid3D(Solid3D::from_sat(&sat.to_sat_string())))?;
    DwgWriter::write_to_file(destination.join("test-unsupported-solid.dwg"), &doc)?;
    let mut doc = CadDocument::new();
    doc.header.insertion_units = 6;
    let mut sat = primitives::build_box([0., 0., 0.], 4., 6., 8.);
    let transform = sat.add_transform(
        [[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]],
        [10., 20., 30.],
        1.,
    );
    sat.records
        .iter_mut()
        .find(|r| r.entity_type == "body")
        .unwrap()
        .tokens[3] = SatToken::Pointer(SatPointer::new(transform));
    let mut layer = Layer::new("test-placed");
    layer.color = Color::GREEN;
    doc.layers.add(layer)?;
    let mut direct = Solid3D::from_sat(&sat.to_sat_string());
    direct.common.layer = "test-placed".into();
    doc.add_entity(EntityType::Solid3D(direct))?;
    let mut block = BlockRecord::new("test-block");
    block.handle = doc.allocate_handle();
    block.base_point = Vector3::new(10., 20., 30.);
    let owner = block.handle;
    doc.block_records.add(block)?;
    let mut solid = Solid3D::from_sat(&sat.to_sat_string());
    solid.common.owner_handle = owner;
    solid.common.color = Color::ByBlock;
    doc.add_entity(EntityType::Solid3D(solid))?;
    doc.layers.add(Layer::new("test-insert"))?;
    let mut insert = Insert::new("test-block", Vector3::new(100., 200., 300.))
        .with_uniform_scale(2.)
        .with_rotation(std::f64::consts::FRAC_PI_2);
    insert.common.layer = "test-insert".into();
    insert.common.color = Color::from_rgb(64, 128, 192);
    doc.add_entity(EntityType::Insert(insert))?;
    DwgWriter::write_to_file(destination.join("test-placed-solids.dwg"), &doc)?;
    Ok(())
}
