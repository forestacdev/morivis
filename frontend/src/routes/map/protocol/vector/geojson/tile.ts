import type { FeatureCollection } from 'geojson';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import { normalizeSheetFeatures } from './topographic-sheets/features';

export interface GeojsonTileRequest {
	id: number;
	z: number;
	x: number;
	y: number;
	geojson: FeatureCollection;
	transform?: 'topographic-sheets';
}

// 生成側と出力側で同じ座標範囲を使う。値が違うと描画位置がずれる。
const TILE_EXTENT = 4096;

export const createGeojsonTile = ({ geojson, z, x, y, transform }: Omit<GeojsonTileRequest, 'id'>): Uint8Array => {
	const data = transform === 'topographic-sheets' ? normalizeSheetFeatures([geojson]) : geojson;
	const tile = geojsonvt(data, {
		maxZoom: 22,
		tolerance: transform === 'topographic-sheets' ? 0 : 3,
		extent: TILE_EXTENT,
		buffer: 64
	}).getTile(z, x, y);
	if (!tile) return new Uint8Array();
	return vtpbf.fromGeojsonVt({ geojsonLayer: tile as unknown as ReturnType<typeof geojsonvt> }, {
		version: 2, extent: TILE_EXTENT
	});
};
