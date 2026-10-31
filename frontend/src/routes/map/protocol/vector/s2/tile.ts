import { createS2Grid } from '$routes/map/utils/mesh/s2';
import { tileToBBOX } from '@mapbox/tilebelt';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import type { S2Tile } from './request';

export const createS2Tile = ({ level, z, x, y }: S2Tile): Uint8Array => {
	const [west, south, east, north] = tileToBBOX([x, y, z]);
	const longitudePadding = (east - west) * 64 / 4096;
	const latitudePadding = (north - south) * 64 / 4096;
	const grid = createS2Grid(level, [
		Math.max(-180, west - longitudePadding),
		Math.max(-85.05112878, south - latitudePadding),
		Math.min(180, east + longitudePadding),
		Math.min(85.05112878, north + latitudePadding)
	]);
	const tile = geojsonvt(grid, { maxZoom: 24, extent: 4096, buffer: 64, tolerance: 0 }).getTile(
		z,
		x,
		y
	);
	if (!tile) return new Uint8Array();
	// vt-pbf の型定義はタイルではなくインデックスを要求する。
	return vtpbf.fromGeojsonVt({ s2: tile as unknown as ReturnType<typeof geojsonvt> }, {
		version: 2
	});
};
