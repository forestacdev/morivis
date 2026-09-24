import { getJapanPlaneRectangularProj4 } from '$routes/map/utils/proj/japan-plane-rectangular';
import type { FeatureCollection, LineString, Position } from 'geojson';
import proj4 from 'proj4';
import { PLANE_GRID_BOUNDS, PLANE_GRID_LEVELS } from './plane-grid-config';

type Bounds = [number, number, number, number];
interface GridProperties {
	axis: 'X' | 'Y';
	value: number;
	label: string;
	zone: number;
	spacing: number;
	major: boolean;
}

export const createPlaneGrid = (
	zone: number,
	spacing: number,
	bounds: Bounds
): FeatureCollection<LineString, GridProperties> => {
	const definition = getJapanPlaneRectangularProj4(zone, 'jgd2011');
	if (!definition) throw new Error('Invalid plane grid zone');
	if (!PLANE_GRID_LEVELS.some(level => level.spacing === spacing)) {
		throw new Error('Invalid plane grid spacing');
	}
	if (!bounds.every(Number.isFinite) || bounds[0] >= bounds[2] || bounds[1] >= bounds[3]) {
		throw new Error('Invalid plane grid bounds');
	}
	const result: FeatureCollection<LineString, GridProperties> = {
		type: 'FeatureCollection',
		features: []
	};
	const west = Math.max(bounds[0], PLANE_GRID_BOUNDS[0]);
	const south = Math.max(bounds[1], PLANE_GRID_BOUNDS[1]);
	const east = Math.min(bounds[2], PLANE_GRID_BOUNDS[2]);
	const north = Math.min(bounds[3], PLANE_GRID_BOUNDS[3]);
	if (west >= east || south >= north) return result;
	const projection = proj4('EPSG:4326', definition);
	// 四隅だけでは投影後の辺の極値を逃すため、各辺を分割して範囲を求める。
	const perimeter: number[][] = [];
	for (let i = 0; i <= 32; i++) {
		const lng = west + (east - west) * i / 32;
		const lat = south + (north - south) * i / 32;
		perimeter.push(
			...[[lng, south], [lng, north], [west, lat], [east, lat]].map(p =>
				projection.forward(p)
			)
		);
	}
	if (perimeter.some(p => !p.every(Number.isFinite))) {
		throw new Error('Unable to project plane grid bounds');
	}
	// proj4の順序は [東方向, 北方向]。日本の平面直角座標の [X, Y] とは逆。
	const minE = Math.floor(Math.min(...perimeter.map(p => p[0])) / spacing) - 1;
	const maxE = Math.ceil(Math.max(...perimeter.map(p => p[0])) / spacing) + 1;
	const minN = Math.floor(Math.min(...perimeter.map(p => p[1])) / spacing) - 1;
	const maxN = Math.ceil(Math.max(...perimeter.map(p => p[1])) / spacing) + 1;
	if (maxE - minE + maxN - minN > 512) {
		throw new Error('Plane grid extent is too large for this spacing');
	}
	const addLine = (axis: 'X' | 'Y', index: number, start: number, end: number) => {
		const value = index * spacing;
		const length = (end - start) * spacing;
		const count = Math.max(1, Math.ceil(length / Math.min(spacing, 10000)));
		const coordinates: Position[] = [];
		for (let i = 0; i <= count; i++) {
			const along = start * spacing + length * i / count;
			coordinates.push(projection.inverse(axis === 'X' ? [along, value] : [value, along]));
		}
		result.features.push({
			type: 'Feature',
			properties: {
				axis,
				value,
				label: `${axis}=${value.toLocaleString('en-US')} m`,
				zone,
				spacing,
				major: index % 5 === 0
			},
			geometry: { type: 'LineString', coordinates }
		});
	};
	for (let i = minN; i <= maxN; i++) addLine('X', i, minE, maxE);
	for (let i = minE; i <= maxE; i++) addLine('Y', i, minN, maxN);
	return result;
};
