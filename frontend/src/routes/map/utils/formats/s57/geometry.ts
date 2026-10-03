import type { AnyGeometry } from '$routes/map/types/geometry';
import { formatS57 } from './definition';

export type XY = [number, number];
export type Coordinate = [number, number, number?];
export interface Pointer {
	key: string;
	orientation: number;
	usage: number;
	topology: number;
}
export interface Spatial {
	kind: number;
	points: Coordinate[];
	pointers: Pointer[];
}
const equal = (a: XY, b: XY) => a[0] === b[0] && a[1] === b[1];
const area = (ring: XY[]) => {
	let sum = 0;
	for (let i = 1; i < ring.length; i++) {
		sum += ring[i - 1][0] * ring[i][1] - ring[i][0] * ring[i - 1][1];
	}
	return sum / 2;
};
export const geometryBuilder = (
	spatial: Map<string, Spatial>,
	consume: (count: number) => void
) => {
	const get = (key: string) => {
		const record = spatial.get(key);
		if (!record) throw new Error(`S-57の空間参照先が見つかりません: ${key}`);
		return record;
	};
	const node = (key: string): XY => {
		const record = get(key);
		if (
			record.kind !== 120 || record.points.length !== 1 || record.points[0][2] !== undefined
		) {
			throw new Error('S-57の接続点が不正です');
		}
		return [record.points[0][0], record.points[0][1]];
	};
	const edge = (pointer: Pointer): XY[] => {
		const record = get(pointer.key);
		if (record.kind !== 130 || ![1, 2].includes(pointer.orientation)) {
			throw new Error('S-57のエッジ参照が不正です');
		}
		const starts = record.pointers.filter(p => p.topology === 1);
		const ends = record.pointers.filter(p => p.topology === 2);
		if (
			starts.length !== 1 || ends.length !== 1 || record.points.some(p => p[2] !== undefined)
		) {
			throw new Error('S-57のエッジの始点・終点が不正です');
		}
		consume(record.points.length + 2);
		const points: XY[] = [
			node(starts[0].key),
			...record.points.map((p): XY => [p[0], p[1]]),
			node(ends[0].key)
		];
		// 日付変更線をまたぐ面の穴判定・bboxを誤らせない。分割済みセルを要求する。
		for (let i = 1; i < points.length; i++) {
			if (Math.abs(points[i][0] - points[i - 1][0]) > 180) {
				throw new Error(
					'日付変更線をまたぐS-57の線・面は未対応です。経度180度で分割してください'
				);
			}
		}
		return pointer.orientation === 2 ? points.reverse() : points;
	};
	const chains = (pointers: Pointer[], rings: boolean): XY[][] => {
		const result: XY[][] = [];
		let current: XY[] = [];
		for (const pointer of pointers) {
			const points = edge(pointer);
			if (current.length && !equal(current[current.length - 1], points[0])) {
				if (rings) throw new Error('S-57の面の境界がつながっていません');
				result.push(current);
				current = [];
			}
			for (let i = current.length ? 1 : 0; i < points.length; i++) current.push(points[i]);
			if (rings && equal(current[0], current[current.length - 1])) {
				if (current.length < 4 || area(current) === 0) {
					throw new Error('S-57に面積のない境界があります');
				}
				result.push(current);
				current = [];
			}
		}
		if (current.length) {
			if (rings) throw new Error('S-57の面の境界が閉じていません');
			result.push(current);
		}
		return result;
	};
	let containmentSteps = 0;
	const contains = (ring: XY[], point: XY) => {
		let inside = false;
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			if (++containmentSteps > formatS57.limits.maxVertices * 10) {
				throw new Error('S-57の面の包含判定が処理上限を超えています');
			}
			const [x, y] = ring[i];
			const [px, py] = ring[j];
			if (
				(y > point[1]) !== (py > point[1])
				&& point[0] < (px - x) * (point[1] - y) / (py - y) + x
			) inside = !inside;
		}
		return inside;
	};
	return {
		points: (pointers: Pointer[]): Coordinate[] =>
			pointers.flatMap(pointer => {
				const record = get(pointer.key);
				if (![110, 120].includes(record.kind) || !record.points.length) {
					throw new Error('S-57の点参照が不正です');
				}
				consume(record.points.length);
				return record.points;
			}),
		shape: (primitive: number, pointers: Pointer[]): AnyGeometry => {
			if (primitive === 2) {
				const lines = chains(pointers, false);
				return lines.length === 1
					? { type: 'LineString', coordinates: lines[0] }
					: { type: 'MultiLineString', coordinates: lines };
			}
			if (pointers.some(p => ![1, 2, 3].includes(p.usage))) {
				throw new Error('S-57の面の境界種別が不正です');
			}
			const outers = chains(pointers.filter(p => p.usage !== 2), true);
			const holes = chains(pointers.filter(p => p.usage === 2), true);
			if (!outers.length) throw new Error('S-57の面に外周がありません');
			const polygons = outers.map(ring => [area(ring) > 0 ? ring : ring.reverse()]);
			const sizes = polygons.map(p => Math.abs(area(p[0])));
			for (const hole of holes) {
				let target = -1;
				for (let i = 0; i < polygons.length; i++) {
					if (
						(target < 0 || sizes[i] < sizes[target])
						&& contains(polygons[i][0], hole[0])
					) target = i;
				}
				if (target < 0) throw new Error('S-57の内周を含む外周がありません');
				polygons[target].push(area(hole) < 0 ? hole : hole.reverse());
			}
			return polygons.length === 1
				? { type: 'Polygon', coordinates: polygons[0] }
				: { type: 'MultiPolygon', coordinates: polygons };
		}
	};
};
