use opencadcodec::entities::AcisData;
use opencadcodec::types::Transform;
use opencadcodec::{CadDocument, Color, DwgReader, DxfWriter, EntityType, Vector3};
use opencadkernel::{acis, brep::mesh::TessellationTolerance};
use serde::Serialize;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

pub mod tessellation;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SolidMesh {
    pub layer: String,
    pub color: String,
    pub entity_type: &'static str,
    pub positions: Vec<[f64; 3]>,
    pub triangles: Vec<[usize; 3]>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkippedSolid {
    pub handle: String,
    pub layer: String,
    pub entity_type: &'static str,
    pub block_path: Vec<String>,
    pub reason: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Drawing {
    pub dxf: String,
    pub solids: Vec<SolidMesh>,
    pub skipped_solids: Vec<SkippedSolid>,
    pub solid_descriptors: Vec<SolidDescriptor>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SolidDescriptor {
    pub layer: String,
    pub entity_type: &'static str,
}

fn acis_data(entity: &EntityType) -> Option<(&AcisData, &'static str)> {
    match entity {
        EntityType::Solid3D(value) => Some((&value.acis_data, "3DSOLID")),
        EntityType::Body(value) => Some((&value.acis_data, "BODY")),
        EntityType::Region(value) => Some((&value.acis_data, "REGION")),
        _ => None,
    }
}

struct Collector<'a> {
    doc: &'a CadDocument,
    solids: Vec<SolidMesh>,
    skipped_solids: Vec<SkippedSolid>,
    remaining_triangles: usize,
    inspect_only: bool,
    selected_layers: Option<&'a [String]>,
    solid_descriptors: Vec<SolidDescriptor>,
}

impl Collector<'_> {
    fn visit(
        &mut self,
        entity: &EntityType,
        placement: &Transform,
        layer: &str,
        parent_color: Color,
        path: &mut Vec<String>,
        array: bool,
    ) -> Result<(), String> {
        let common = entity.common();
        if common.invisible {
            return Ok(());
        }
        let layer = if common.layer == "0" {
            layer
        } else {
            &common.layer
        };
        let color = match common.color {
            Color::ByBlock => parent_color,
            Color::ByLayer => self.doc.layers.get(layer).map_or(Color::WHITE, |l| l.color),
            other => other,
        };
        if let EntityType::Insert(insert) = entity {
            if path.len() >= 32 || path.contains(&insert.block_name) {
                return Err("ブロック参照が循環しているか、階層が深すぎます。".into());
            }
            let Some(block) = self.doc.block_records.get(&insert.block_name) else {
                return Err("参照するブロックが見つかりません。".into());
            };
            let base = Transform::from_translation(block.base_point * -1.0);
            let placed = placement.compose(&insert.get_transform()).compose(&base);
            path.push(insert.block_name.clone());
            for child in self.doc.entities_in_block(&insert.block_name) {
                self.visit(
                    child,
                    &placed,
                    layer,
                    color,
                    path,
                    array || insert.is_minsert(),
                )?;
            }
            path.pop();
            return Ok(());
        }
        let Some((data, entity_type)) = acis_data(entity) else {
            return Ok(());
        };
        if self.inspect_only {
            self.solid_descriptors.push(SolidDescriptor {
                layer: layer.into(),
                entity_type,
            });
            return Ok(());
        }
        if self
            .selected_layers
            .is_some_and(|layers| !layers.iter().any(|name| name == layer))
        {
            return Ok(());
        }
        match self.convert_solid(data, entity_type, placement, layer, color, array) {
            Ok(solid) => {
                self.remaining_triangles -= solid.triangles.len();
                self.solids.push(solid);
            }
            Err(reason) => self.skipped_solids.push(SkippedSolid {
                handle: common.handle.to_string(),
                layer: layer.into(),
                entity_type,
                block_path: path.clone(),
                reason: reason.into(),
            }),
        }
        Ok(())
    }

    fn convert_solid(
        &self,
        data: &AcisData,
        entity_type: &'static str,
        placement: &Transform,
        layer: &str,
        color: Color,
        array: bool,
    ) -> Result<SolidMesh, &'static str> {
        if array {
            return Err("配列複写（MINSERT）内のACISソリッドは未対応です。通常のブロックへ展開してください。");
        }
        if self.remaining_triangles == 0 {
            return Err(
                "ACISの三角形数が読み込み上限に達したため除外しました。図面を分割してください。",
            );
        }
        let sat = data
            .parse()
            .ok_or("ACISのSAT/SABデータを解析できませんでした")?;
        let (bodies, loss) = acis::lift(&sat);
        if !loss.is_empty() || bodies.is_empty() || bodies.len() != sat.bodies().len() {
            return Err("未対応または不正なACIS形状が含まれています");
        }
        let (r, g, b) = color.rgb().unwrap_or((255, 255, 255));
        let mut solid = SolidMesh {
            layer: layer.into(),
            color: format!("#{r:02x}{g:02x}{b:02x}"),
            entity_type,
            positions: Vec::new(),
            triangles: Vec::new(),
        };
        for body in bodies {
            // Every successfully tessellated face needs at least one triangle.
            // Avoid expensive meshing when even this lower bound exceeds the budget.
            if body.face_keys().count() > self.remaining_triangles - solid.triangles.len() {
                return Err("ACISの三角形数が読み込み上限を超えるため除外しました。図面を分割すると読み込める場合があります。");
            }
            // The pinned kernel applies the body's ACIS transform during lift.
            let mesh = tessellation::tessellate_body(&body, TessellationTolerance::new(0.15, 1e-6));
            if !mesh.missing_faces.is_empty() || mesh.mesh.triangles.is_empty() {
                return Err("ACISの一部の面をメッシュへ変換できませんでした");
            }
            if mesh.mesh.triangles.len() > self.remaining_triangles - solid.triangles.len() {
                return Err("ACISの三角形数が読み込み上限を超えるため除外しました。図面を分割すると読み込める場合があります。");
            }
            let offset = solid.positions.len();
            for point in mesh.mesh.positions {
                let p = placement.apply(Vector3::new(point[0], point[1], point[2]));
                if ![p.x, p.y, p.z].iter().all(|v| v.is_finite()) {
                    return Err("ACISの座標が不正です");
                }
                solid.positions.push([p.x, p.y, p.z]);
            }
            solid.triangles.extend(
                mesh.mesh
                    .triangles
                    .into_iter()
                    .map(|t| t.map(|i| i + offset)),
            );
        }
        Ok(solid)
    }
}

pub fn read_drawing(bytes: &[u8], max_triangles: usize) -> Result<Drawing, String> {
    read_drawing_selected(bytes, max_triangles, false, None)
}

fn read_drawing_selected(
    bytes: &[u8],
    max_triangles: usize,
    inspect_only: bool,
    selected_layers: Option<&[String]>,
) -> Result<Drawing, String> {
    let mut doc = DwgReader::from_stream(Cursor::new(bytes))
        .read()
        .map_err(|e| e.to_string())?;
    let mut collector = Collector {
        doc: &doc,
        solids: Vec::new(),
        skipped_solids: Vec::new(),
        remaining_triangles: max_triangles,
        inspect_only,
        selected_layers,
        solid_descriptors: Vec::new(),
    };
    for entity in doc.model_space_entities() {
        collector.visit(
            entity,
            &Transform::identity(),
            "0",
            Color::WHITE,
            &mut Vec::new(),
            false,
        )?;
    }
    let solid_descriptors = collector.solid_descriptors;
    let solids = collector.solids;
    let skipped_solids = collector.skipped_solids;
    // Solids are emitted as meshes; do not serialize their potentially large SAT/SAB again.
    let handles: Vec<_> = doc
        .entities()
        .filter(|e| acis_data(e).is_some())
        .map(|e| e.common().handle)
        .collect();
    for handle in handles {
        doc.remove_entity(handle);
    }
    let dxf = DxfWriter::new(&doc)
        .write_to_vec()
        .map_err(|e| e.to_string())?;
    Ok(Drawing {
        dxf: String::from_utf8(dxf).map_err(|e| e.to_string())?,
        solids,
        skipped_solids,
        solid_descriptors,
    })
}

#[wasm_bindgen]
pub fn decode_dwg(bytes: &[u8], max_triangles: usize) -> Result<String, JsValue> {
    let drawing = read_drawing(bytes, max_triangles).map_err(|e| JsValue::from_str(&e))?;
    serde_json::to_string(&drawing).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
#[path = "../tests/fixtures/mod.rs"]
mod test_shapes;

#[cfg(test)]
mod tests {
    use super::*;
    use opencadcodec::{
        entities::{acis::SatDocument, Solid3D},
        DwgWriter,
    };
    use opencadkernel::brep::make::cuboid;

    #[test]
    fn skips_a_whole_multibody_solid_without_charging_its_partial_mesh() {
        let mut document = CadDocument::new();
        let mut multiple = SatDocument::new();
        for x in [0.0, 10.0] {
            let body = cuboid([x, 0.0, 0.0], [2.0, 3.0, 4.0]).unwrap();
            acis::append(&body, &mut multiple).unwrap();
        }
        document
            .add_entity(EntityType::Solid3D(Solid3D::from_sat(
                &multiple.to_sat_string(),
            )))
            .unwrap();
        let mut single = SatDocument::new();
        acis::append(&cuboid([0.0; 3], [2.0, 3.0, 4.0]).unwrap(), &mut single).unwrap();
        document
            .add_entity(EntityType::Solid3D(Solid3D::from_sat(
                &single.to_sat_string(),
            )))
            .unwrap();
        let bytes = DwgWriter::write_to_vec(&document).unwrap();
        let result = read_drawing(&bytes, 12).unwrap();
        assert_eq!(result.skipped_solids.len(), 1);
        assert!(result.skipped_solids[0].reason.contains("上限"));
        assert_eq!(result.solids.len(), 1);
        assert_eq!(result.solids[0].triangles.len(), 12);
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BinarySolid<'a> {
    layer: &'a str,
    color: &'a str,
    entity_type: &'a str,
    vertex_count: usize,
    triangle_count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BinaryHeader<'a> {
    dxf: &'a str,
    skipped_solids: &'a [SkippedSolid],
    solids: Vec<BinarySolid<'a>>,
}

/// Compact, aligned little-endian buffers avoid a single multi-gigabyte JSON string.
fn encode_binary(drawing: &Drawing) -> Result<Vec<u8>, String> {
    let header = serde_json::to_vec(&BinaryHeader {
        dxf: &drawing.dxf,
        skipped_solids: &drawing.skipped_solids,
        solids: drawing
            .solids
            .iter()
            .map(|solid| BinarySolid {
                layer: &solid.layer,
                color: &solid.color,
                entity_type: solid.entity_type,
                vertex_count: solid.positions.len(),
                triangle_count: solid.triangles.len(),
            })
            .collect(),
    })
    .map_err(|error| error.to_string())?;
    let header_len = u32::try_from(header.len()).map_err(|_| "DWGのヘッダーが大きすぎます")?;
    let mut size = 8usize
        .checked_add(header.len())
        .and_then(|n| n.checked_add(7))
        .map(|n| n & !7)
        .ok_or("DWGの変換結果が大きすぎます")?;
    for solid in &drawing.solids {
        size = size
            .checked_add(
                solid
                    .positions
                    .len()
                    .checked_mul(24)
                    .ok_or("頂点数が大きすぎます")?,
            )
            .and_then(|n| {
                solid
                    .triangles
                    .len()
                    .checked_mul(12)
                    .and_then(|length| n.checked_add(length))
            })
            .and_then(|n| n.checked_add(7))
            .map(|n| n & !7)
            .ok_or("DWGの変換結果が大きすぎます")?;
    }
    let mut output = Vec::new();
    output
        .try_reserve_exact(size)
        .map_err(|_| "DWGの変換結果を保持するメモリが不足しています")?;
    output.extend_from_slice(b"MDW1");
    output.extend_from_slice(&header_len.to_le_bytes());
    output.extend_from_slice(&header);
    output.resize((output.len() + 7) & !7, 0);
    for solid in &drawing.solids {
        for point in &solid.positions {
            for value in point {
                output.extend_from_slice(&value.to_le_bytes());
            }
        }
        for triangle in &solid.triangles {
            for index in triangle {
                output.extend_from_slice(
                    &u32::try_from(*index)
                        .map_err(|_| "頂点番号が大きすぎます")?
                        .to_le_bytes(),
                );
            }
        }
        output.resize((output.len() + 7) & !7, 0);
    }
    Ok(output)
}

#[wasm_bindgen]
pub fn decode_dwg_binary(bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
    let drawing = read_drawing(bytes, usize::MAX).map_err(|e| JsValue::from_str(&e))?;
    encode_binary(&drawing).map_err(|e| JsValue::from_str(&e))
}

/// Inventory does not parse SAT/SAB or tessellate any solid.
#[wasm_bindgen]
pub fn inspect_dwg(bytes: &[u8]) -> Result<String, JsValue> {
    let drawing =
        read_drawing_selected(bytes, usize::MAX, true, None).map_err(|e| JsValue::from_str(&e))?;
    serde_json::to_string(&drawing).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn decode_dwg_layers(bytes: &[u8], layers_json: &str) -> Result<Vec<u8>, JsValue> {
    let layers: Vec<String> =
        serde_json::from_str(layers_json).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let drawing = read_drawing_selected(bytes, usize::MAX, false, Some(&layers))
        .map_err(|e| JsValue::from_str(&e))?;
    encode_binary(&drawing).map_err(|e| JsValue::from_str(&e))
}
