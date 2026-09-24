import type { FeatureCollection, LineString, Point, Position } from 'geojson';
import { cellToBoundary, cellToLatLng, getRes0Cells, gridDisk, latLngToCell } from 'h3-js';

type Bounds = [number, number, number, number];
type H3Grid = FeatureCollection<LineString | Point, { code: string; resolution: number; }>;
const MAX_VISITED_CELLS = 4096;

// 日付変更線をまたぐ辺を短い側につなぐ。極を囲むセルも最後の辺まで連続させる。
const unwrapBoundary = (cell: string, longitude: number): Position[] => {
	let previous = longitude;
	return cellToBoundary(cell, true).map(([lng, lat]) => {
		const unwrapped = lng + 360 * Math.round((previous - lng) / 360);
		previous = unwrapped;
		return [unwrapped, lat];
	});
};

export const createH3Grid = (resolution: number, bounds: Bounds): H3Grid => {
	if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
		throw new Error('Invalid H3 resolution');
	}
	const [west, south, east, north] = bounds;
	if (
		!bounds.every(Number.isFinite) || west >= east || south >= north
		|| east - west > 360 || south < -90 || north > 90
	) {
		throw new Error('Invalid H3 bounds');
	}
	const result: H3Grid = { type: 'FeatureCollection', features: [] };
	const centerLng = (west + east) / 2;
	const seeds = resolution === 0
		? getRes0Cells()
		: [west, centerLng, east].flatMap(lng =>
			[south, (south + north) / 2, north].map(lat => latLngToCell(lat, lng, resolution))
		);
	const queue = [...new Set(seeds)];
	const visited = new Set(queue);
	for (let i = 0; i < queue.length; i++) {
		const code = queue[i];
		const coordinates = unwrapBoundary(code, centerLng);
		const left = Math.min(...coordinates.map(p => p[0]));
		const right = Math.max(...coordinates.map(p => p[0]));
		const bottom = Math.min(...coordinates.map(p => p[1]));
		const top = Math.max(...coordinates.map(p => p[1]));
		// ±360度の同じセルも考慮し、日付変更線の両側で欠落させない。
		const intersects = bottom <= north && top >= south && [-360, 0, 360].some(
			shift => left + shift <= east && right + shift >= west
		);
		if (!intersects && !seeds.includes(code)) continue;
		if (intersects) {
			const [lat, lng] = cellToLatLng(code);
			const properties = { code, resolution };
			result.features.push(
				{ type: 'Feature', properties, geometry: { type: 'LineString', coordinates } },
				{
					type: 'Feature',
					properties,
					geometry: { type: 'Point', coordinates: [lng, lat] }
				}
			);
		}
		if (resolution === 0) continue;
		for (const neighbor of gridDisk(code, 1)) {
			if (visited.has(neighbor)) continue;
			visited.add(neighbor);
			if (visited.size > MAX_VISITED_CELLS) {
				throw new Error('H3 extent is too large for this resolution');
			}
			queue.push(neighbor);
		}
	}
	return result;
};
