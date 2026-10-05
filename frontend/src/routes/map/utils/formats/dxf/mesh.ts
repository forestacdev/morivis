import type { FeatureCollection, MultiPolygon3DFeatureCollection } from '$routes/map/types/geojson';
import {
	Box3,
	BufferAttribute,
	BufferGeometry,
	Color,
	DoubleSide,
	Float32BufferAttribute,
	Group,
	Mesh,
	MeshStandardMaterial,
	ShapeUtils,
	Vector2,
	Vector3
} from 'three';

import type { IndexedCadMesh } from './indexed-mesh';

type Position = [number, number, number];

class EmptyDxfMeshError extends Error {
	constructor() {
		super('メッシュに変換できるDXFの面がありません');
	}
}

const readRing = (coordinates: number[][]): Position[] => {
	const points = coordinates.map(([x, y, z = 0]): Position => {
		if (![x, y, z].every(Number.isFinite)) throw new Error('DXFの面に不正な座標があります');
		return [x, y, z];
	}).filter((point, index, all) =>
		index === 0 || point.some((value, axis) => value !== all[index - 1][axis])
	);
	if (points.length > 1 && points[0].every((value, axis) => value === points.at(-1)![axis])) {
		points.pop();
	}
	return points;
};

/** メートル換算済みのDXF面群を、Y-upのローカルメッシュへ変換する。 */
export const createDxfMesh = (geojson: FeatureCollection | MultiPolygon3DFeatureCollection) => {
	const bounds = new Box3();
	const faces = geojson.features.flatMap((feature) => {
		const geometry = feature.geometry;
		const polygons = geometry.type === 'Polygon'
			? [geometry.coordinates]
			: geometry.type === 'MultiPolygon'
			? geometry.coordinates
			: [];
		const colorValue = feature.properties?.color;
		const color =
			typeof colorValue === 'string' && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(colorValue)
				? colorValue
				: '#c0c0c0';
		return polygons.flatMap((polygon) => {
			const rings = polygon.map(readRing);
			if (!rings[0] || rings[0].length < 3) return [];
			for (const ring of rings) {
				for (const point of ring) bounds.expandByPoint(new Vector3(...point));
			}
			return [{ rings, color }];
		});
	});
	if (bounds.isEmpty()) throw new EmptyDxfMeshError();
	const origin = bounds.getCenter(new Vector3());
	origin.z = bounds.min.z;
	const positions: number[] = [];
	const colors: number[] = [];
	const palette = new Map<string, Color>();
	for (const face of faces) {
		const rings = face.rings.map((ring) =>
			ring.map(([x, y, z]) => new Vector3(x - origin.x, z - origin.z, -(y - origin.y)))
		);
		const shell = rings[0];
		const normal = new Vector3();
		for (let i = 1; i < shell.length - 1; i++) {
			normal.add(new Vector3().crossVectors(
				shell[i].clone().sub(shell[0]),
				shell[i + 1].clone().sub(shell[0])
			));
		}
		if (normal.lengthSq() === 0) continue;
		// 壁も潰さず三角形分割できるよう、面積が最大になる平面へ投影する。
		const axis =
			Math.abs(normal.x) >= Math.abs(normal.y) && Math.abs(normal.x) >= Math.abs(normal.z)
				? 'x'
				: Math.abs(normal.y) >= Math.abs(normal.z)
				? 'y'
				: 'z';
		const projected = rings.map((ring) =>
			ring.map((p) =>
				axis === 'x'
					? new Vector2(p.y, p.z)
					: axis === 'y'
					? new Vector2(p.x, p.z)
					: new Vector2(p.x, p.y)
			)
		);
		const triangles = ShapeUtils.triangulateShape(projected[0], projected.slice(1));
		const points = rings.flat();
		let color = palette.get(face.color);
		if (!color) {
			color = new Color(face.color);
			palette.set(face.color, color);
		}
		for (const triangle of triangles) {
			const [a, b, c] = triangle.map((index) => points[index]);
			const triangleNormal = new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
			if (triangleNormal.lengthSq() === 0) continue;
			const vertices = triangleNormal.dot(normal) < 0 ? [a, c, b] : [a, b, c];
			for (const point of vertices) {
				positions.push(point.x, point.y, point.z);
				// THREE.Colorが変換したLinear-sRGBを頂点色へ格納する。
				colors.push(color.r, color.g, color.b);
			}
		}
	}
	if (!positions.length) throw new EmptyDxfMeshError();
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
	geometry.computeVertexNormals();
	geometry.computeBoundingBox();
	const material = new MeshStandardMaterial({
		vertexColors: true,
		roughness: 1,
		metalness: 0,
		side: DoubleSide
	});
	const mesh = new Mesh(geometry, material);
	mesh.name = 'DXF';
	mesh.userData = { sourceFormat: 'DXF', sourceOrigin: origin.toArray(), coordinateUnit: 'm' };
	return mesh;
};

export const disposeDxfModel = (model: Group) => {
	const materials = new Set<MeshStandardMaterial>();
	model.traverse((object) => {
		if (!(object instanceof Mesh)) return;
		object.geometry.dispose();
		materials.add(object.material);
	});
	for (const material of materials) material.dispose();
};

/** ポリフェイスとACISソリッドは個別オブジェクトとして保持し、単独の面はレイヤー別にまとめる。 */
export const createDxfModel = (
	geojson: FeatureCollection,
	indexedMeshes: IndexedCadMesh[] = []
) => {
	const parts = new Map<
		string,
		{
			name: string;
			layer: string;
			entityIndex?: number;
			entityType?: string;
			data: FeatureCollection;
		}
	>();
	const bounds = new Box3();
	geojson.features.forEach((feature, index) => {
		const geometry = feature.geometry;
		const polygons = geometry.type === 'Polygon'
			? [geometry.coordinates]
			: geometry.type === 'MultiPolygon'
			? geometry.coordinates
			: [];
		if (!polygons.length) return;
		const layer = String(feature.properties?.layer ?? '未分類');
		const entityType = String(feature.properties?.type ?? '');
		const isSeparateEntity = ['POLYLINE', '3DSOLID', 'BODY', 'REGION'].includes(entityType);
		const key = isSeparateEntity ? `entity:${index}` : `layer:${layer}`;
		let part = parts.get(key);
		if (!part) {
			part = {
				name: isSeparateEntity ? `${layer} #${index + 1}` : layer,
				layer,
				...(isSeparateEntity ? { entityIndex: index, entityType } : {}),
				data: { type: 'FeatureCollection', features: [] }
			};
			parts.set(key, part);
		}
		part.data.features.push(feature);
		for (const polygon of polygons) {
			for (const ring of polygon) {
				for (const [x, y, z = 0] of ring as number[][]) {
					if (![x, y, z].every(Number.isFinite)) {
						throw new Error('DXFの面に不正な座標があります');
					}
					bounds.expandByPoint(new Vector3(x, y, z));
				}
			}
		}
	});
	for (const mesh of indexedMeshes) {
		bounds.expandByPoint(new Vector3(...mesh.bounds.slice(0, 3)));
		bounds.expandByPoint(new Vector3(...mesh.bounds.slice(3, 6)));
	}
	if (bounds.isEmpty()) throw new EmptyDxfMeshError();
	const origin = bounds.getCenter(new Vector3());
	origin.z = bounds.min.z;
	const model = new Group();
	model.name = 'DXF';
	model.userData = { sourceFormat: 'DXF', sourceOrigin: origin.toArray(), coordinateUnit: 'm' };
	let material: MeshStandardMaterial | undefined;
	try {
		for (const part of parts.values()) {
			let mesh: ReturnType<typeof createDxfMesh>;
			try {
				mesh = createDxfMesh(part.data);
			} catch (error) {
				if (error instanceof EmptyDxfMeshError) continue;
				throw error;
			}
			const [x, y, z] = mesh.userData.sourceOrigin as Position;
			// 各部品は自身の原点を持ち、親モデル内の位置関係はノードの平行移動で保持する。
			mesh.position.set(x - origin.x, z - origin.z, -(y - origin.y));
			mesh.name = part.name;
			mesh.userData = {
				...mesh.userData,
				layer: part.layer,
				sourceEntityCount: part.data.features.length,
				...(part.entityIndex !== undefined
					? { sourceEntityIndex: part.entityIndex, entityType: part.entityType }
					: {})
			};
			if (material) {
				mesh.material.dispose();
				mesh.material = material;
			} else {
				material = mesh.material;
			}
			model.add(mesh);
		}
		const indexedMaterials = new Map<string, MeshStandardMaterial>();
		for (const [index, part] of indexedMeshes.entries()) {
			const partOrigin = new Vector3(
				(part.bounds[0] + part.bounds[3]) / 2,
				(part.bounds[1] + part.bounds[4]) / 2,
				part.bounds[2]
			);
			const positions = new Float32Array(part.positions.length);
			for (let i = 0; i < positions.length; i += 3) {
				positions[i] = part.positions[i] - partOrigin.x;
				positions[i + 1] = part.positions[i + 2] - partOrigin.z;
				positions[i + 2] = -(part.positions[i + 1] - partOrigin.y);
			}
			const geometry = new BufferGeometry();
			geometry.setAttribute('position', new BufferAttribute(positions, 3));
			geometry.setIndex(new BufferAttribute(part.indices, 1));
			geometry.computeVertexNormals();
			geometry.computeBoundingBox();
			let partMaterial = indexedMaterials.get(part.color);
			if (!partMaterial) {
				partMaterial = new MeshStandardMaterial({
					color: part.color,
					roughness: 1,
					metalness: 0,
					side: DoubleSide
				});
				indexedMaterials.set(part.color, partMaterial);
			}
			const mesh = new Mesh(geometry, partMaterial);
			mesh.name = `${part.layer} #${index + 1}`;
			mesh.position.set(
				partOrigin.x - origin.x,
				partOrigin.z - origin.z,
				-(partOrigin.y - origin.y)
			);
			mesh.userData = {
				sourceFormat: 'DWG',
				sourceOrigin: partOrigin.toArray(),
				coordinateUnit: 'm',
				layer: part.layer,
				entityType: part.entityType,
				sourceEntityIndex: index,
				sourceEntityCount: 1
			};
			model.add(mesh);
		}
		if (!model.children.length) throw new EmptyDxfMeshError();
		return model;
	} catch (error) {
		disposeDxfModel(model);
		throw error;
	}
};
