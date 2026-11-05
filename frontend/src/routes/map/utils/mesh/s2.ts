import type { FeatureCollection, LineString, Point, Position } from 'geojson';
import { r1, s1, s2 } from 's2js';

type Bounds = [number, number, number, number];
type S2Grid = FeatureCollection<LineString | Point, { code: string; level: number; }>;
const DEGREES = 180 / Math.PI;
const MAX_VISITED_CELLS = 4096;
const MERCATOR_LATITUDE = 85.0511287798066;

const toCoordinates = (point: s2.Point): Position => {
	const ll = s2.LatLng.fromPoint(point);
	return [ll.lng * DEGREES, ll.lat * DEGREES];
};

const midpoint = (a: s2.Point, b: s2.Point) =>
	s2.Point.fromCoords(
		a.vector.x + b.vector.x,
		a.vector.y + b.vector.y,
		a.vector.z + b.vector.z
	);

const mercatorY = (latitude: number) => {
	const sin = Math.sin(
		Math.max(-MERCATOR_LATITUDE, Math.min(MERCATOR_LATITUDE, latitude)) / DEGREES
	);
	return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
};

// 投影可能な緯度で切る。範囲外の辺が地図の上下端へ押しつぶされるのを防ぐ。
const clipLatitude = (coordinates: Position[]): Position[][] => {
	const lines: Position[][] = [];
	let current: Position[] | undefined;
	for (let i = 1; i < coordinates.length; i++) {
		const a = coordinates[i - 1];
		const b = coordinates[i];
		const dy = b[1] - a[1];
		const low = dy === 0
			? 0
			: Math.min((-MERCATOR_LATITUDE - a[1]) / dy, (MERCATOR_LATITUDE - a[1]) / dy);
		const high = dy === 0
			? 1
			: Math.max((-MERCATOR_LATITUDE - a[1]) / dy, (MERCATOR_LATITUDE - a[1]) / dy);
		const start = Math.max(0, low);
		const end = Math.min(1, high);
		if (start >= end || (dy === 0 && Math.abs(a[1]) > MERCATOR_LATITUDE)) {
			current = undefined;
			continue;
		}
		const at = (t: number): Position => [a[0] + (b[0] - a[0]) * t, a[1] + dy * t];
		if (!current || start > 0) {
			current = [at(start)];
			lines.push(current);
		}
		current.push(at(end));
		if (end < 1) current = undefined;
	}
	return lines;
};

// 大円の辺を投影後の誤差で細分化する。各辺を別の線にして極を横断する線を作らない。
const edgeCoordinates = (a: s2.Point, b: s2.Point, level: number): Position[] => {
	const start = toCoordinates(a);
	const end = toCoordinates(b);
	if (Math.abs(start[1]) > 89.999999) start[0] = end[0];
	if (Math.abs(end[1]) > 89.999999) end[0] = start[0];
	end[0] += 360 * Math.round((start[0] - end[0]) / 360);
	const coordinates = [start];
	const tolerance = 0.5 / (512 * 2 ** level);
	const subdivide = (p: s2.Point, q: s2.Point, from: Position, to: Position, depth: number) => {
		const mid = midpoint(p, q);
		const pos = toCoordinates(mid);
		pos[0] += 360 * Math.round(((from[0] + to[0]) / 2 - pos[0]) / 360);
		const dx = (to[0] - from[0]) / 360;
		const dy = mercatorY(to[1]) - mercatorY(from[1]);
		const mx = (pos[0] - from[0]) / 360;
		const my = mercatorY(pos[1]) - mercatorY(from[1]);
		const length = Math.hypot(dx, dy);
		const error = length === 0 ? Math.hypot(mx, my) : Math.abs(dx * my - dy * mx) / length;
		if (error > tolerance && depth < 12) {
			subdivide(p, mid, from, pos, depth + 1);
			subdivide(mid, q, pos, to, depth + 1);
		} else {
			coordinates.push(to);
		}
	};
	subdivide(a, b, start, end, 0);
	return coordinates;
};

export const createS2Grid = (level: number, bounds: Bounds): S2Grid => {
	if (!Number.isInteger(level) || level < 0 || level > 30) throw new Error('Invalid S2 level');
	const [west, south, east, north] = bounds;
	if (
		!bounds.every(Number.isFinite) || west < -180 || east > 180 || west >= east
		|| south < -90 || north > 90 || south >= north
	) throw new Error('Invalid S2 bounds');
	const region = new s2.Rect(
		new r1.Interval(south / DEGREES, north / DEGREES),
		s1.Interval.fromEndpoints(west / DEGREES, east / DEGREES)
	);
	const result: S2Grid = { type: 'FeatureCollection', features: [] };
	const queue = Array.from(
		{ length: 6 },
		(_, face) => s2.Cell.fromCellID(s2.cellid.fromFace(face))
	);
	let visited = 0;
	while (queue.length) {
		const cell = queue.pop()!;
		if (++visited > MAX_VISITED_CELLS) throw new Error('S2 extent is too large for this level');
		if (!region.intersects(cell.rectBound())) continue;
		if (cell.level < level) {
			queue.push(...cell.children());
			continue;
		}
		// 64bit IDは数値に変換せず、S2標準の16進tokenとして保持・表示する。
		const properties = { code: s2.cellid.toToken(cell.id), level };
		for (let edge = 0; edge < 4; edge++) {
			const lines = clipLatitude(
				edgeCoordinates(cell.vertex(edge), cell.vertex((edge + 1) % 4), level)
			);
			for (const coordinates of lines) {
				result.features.push({
					type: 'Feature',
					properties,
					geometry: {
						type: 'LineString',
						coordinates
					}
				});
			}
		}
		const center = toCoordinates(cell.center());
		if (Math.abs(center[1]) <= MERCATOR_LATITUDE) {
			result.features.push({
				type: 'Feature',
				properties,
				geometry: { type: 'Point', coordinates: center }
			});
		}
	}
	return result;
};
