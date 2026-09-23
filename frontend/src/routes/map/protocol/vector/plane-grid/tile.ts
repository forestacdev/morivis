import { createPlaneGrid } from '$routes/map/utils/mesh/plane-grid';
import { PLANE_GRID_BOUNDS } from '$routes/map/utils/mesh/plane-grid-config';
import { tileToBBOX } from '@mapbox/tilebelt';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import type { PlaneGridTile } from './request';

export const createPlaneGridTile = ({ zone, spacing, z, x, y }: PlaneGridTile): Uint8Array => {
	const [west, south, east, north] = tileToBBOX([x, y, z]);
	const longitudePadding = (east - west) * 64 / 4096;
	const latitudePadding = (north - south) * 64 / 4096;
	const grid = createPlaneGrid(zone, spacing, [
		west - longitudePadding,
		south - latitudePadding,
		east + longitudePadding,
		north + latitudePadding
	]);
	if (!grid.features.length) return new Uint8Array();
	// 生成した方眼は投影後の外接矩形まで延びる。描画範囲の外側を切り落とす。
	const [minLng, minLat, maxLng, maxLat] = PLANE_GRID_BOUNDS;
	grid.features = grid.features.flatMap(feature => {
		// 描画領域の境界では細分した各線分を矩形にクリップする。
		const parts: number[][][] = [];
		const points = feature.geometry.coordinates;
		for (let i = 1; i < points.length; i++) {
			const a = points[i - 1], b = points[i];
			let from = 0, to = 1;
			const dx = b[0] - a[0], dy = b[1] - a[1];
			const edges = [[-dx, a[0] - minLng], [dx, maxLng - a[0]], [-dy, a[1] - minLat], [
				dy,
				maxLat - a[1]
			]];
			for (const [p, q] of edges) {
				if (p === 0) {
					if (q < 0) to = -1;
					continue;
				}
				if (p < 0) from = Math.max(from, q / p);
				else to = Math.min(to, q / p);
			}
			if (from > to) continue;
			const start = from === 0 ? a : [a[0] + dx * from, a[1] + dy * from];
			const end = to === 1 ? b : [a[0] + dx * to, a[1] + dy * to];
			const last = parts.at(-1);
			if (last && from === 0 && last.at(-1)![0] === a[0] && last.at(-1)![1] === a[1]) {
				last.push(end);
			} else parts.push([start, end]);
		}
		return parts.map(coordinates => ({
			...feature,
			geometry: { type: 'LineString' as const, coordinates }
		}));
	});
	grid.features = grid.features.filter(feature => feature.geometry.coordinates.length >= 2);
	const tile = geojsonvt(grid, { maxZoom: 20, extent: 4096, buffer: 64, tolerance: 0 }).getTile(
		z,
		x,
		y
	);
	if (!tile) return new Uint8Array();
	return vtpbf.fromGeojsonVt({ plane_grid: tile as unknown as ReturnType<typeof geojsonvt> }, {
		version: 2
	});
};
