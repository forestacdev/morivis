import { createRegionalMeshGrid } from '$routes/map/utils/mesh/regional-mesh';
import { tileToBBOX } from '@mapbox/tilebelt';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import type { RegionalMeshTile } from './request';

export const createRegionalMeshTile = ({ level, z, x, y }: RegionalMeshTile): Uint8Array => {
	const [west, south, east, north] = tileToBBOX([x, y, z]);
	const longitudePadding = (east - west) * 64 / 4096;
	const latitudePadding = (north - south) * 64 / 4096;
	const grid = createRegionalMeshGrid(level, [
		west - longitudePadding,
		south - latitudePadding,
		east + longitudePadding,
		north + latitudePadding
	]);
	if (!grid.features.length) return new Uint8Array();
	const tile = geojsonvt(grid, { maxZoom: 16, extent: 4096, buffer: 64, tolerance: 0 }).getTile(
		z,
		x,
		y
	);
	if (!tile) return new Uint8Array();
	// @types/vt-pbf はタイルではなくインデックスの型を要求するため、ここで型を合わせる。
	return vtpbf.fromGeojsonVt({ regional_mesh: tile as unknown as ReturnType<typeof geojsonvt> }, {
		version: 2
	});
};
