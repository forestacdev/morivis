import type { MultiPolygon3DFeatureCollection } from '$routes/map/types/geojson';

/** メートル単位のCADメッシュ。面ごとの座標配列へ展開せず、頂点を共有する。 */
export interface IndexedCadMesh {
	layer: string;
	color: string;
	entityType: '3DSOLID' | 'BODY' | 'REGION';
	positions: Float64Array;
	indices: Uint32Array;
	bounds: [number, number, number, number, number, number];
}

export const scaleIndexedCadMesh = (mesh: IndexedCadMesh, metersPerUnit: number) => {
	const bounds: IndexedCadMesh['bounds'] = [
		Infinity,
		Infinity,
		Infinity,
		-Infinity,
		-Infinity,
		-Infinity
	];
	for (let i = 0; i < mesh.positions.length; i++) {
		const axis = i % 3;
		const value = mesh.positions[i] * metersPerUnit;
		if (!Number.isFinite(value)) throw new Error('CADメッシュの座標が不正です');
		mesh.positions[i] = value;
		bounds[axis] = Math.min(bounds[axis], value);
		bounds[axis + 3] = Math.max(bounds[axis + 3], value);
	}
	mesh.bounds = bounds;
};

/** GeoJSONとして登録する場合にだけ座標配列へ展開する。 */
export const indexedCadMeshToFeature = (
	mesh: IndexedCadMesh
): MultiPolygon3DFeatureCollection['features'][number] => {
	const coordinates:
		MultiPolygon3DFeatureCollection['features'][number]['geometry']['coordinates'] = [];
	const pointAt = (index: number): [number, number, number] => {
		const offset = index * 3;
		return [mesh.positions[offset], mesh.positions[offset + 1], mesh.positions[offset + 2]];
	};
	for (let i = 0; i < mesh.indices.length; i += 3) {
		const a = pointAt(mesh.indices[i]);
		coordinates.push([[a, pointAt(mesh.indices[i + 1]), pointAt(mesh.indices[i + 2]), a]]);
	}
	return {
		type: 'Feature',
		properties: { layer: mesh.layer, color: mesh.color, type: mesh.entityType },
		geometry: { type: 'MultiPolygon', coordinates }
	};
};
