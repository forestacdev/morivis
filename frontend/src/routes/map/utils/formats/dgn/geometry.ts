// DGNLibの曲線補間を参照。THIRD_PARTY_NOTICES.mdを参照。
import type { AnyGeometry } from '$routes/map/types/geometry';

export type XY = [number, number];

/** Type 11の両端2点は接線計算用。DGNLibと同じAkima補間でXYへ近似する。 */
export const strokeCurve = (points: XY[]): XY[] => {
	const n = points.length;
	if (n < 6) throw new Error('DGNの曲線には6頂点以上が必要です');
	const count = n * 5;
	const distances: number[] = [];
	const slopes: XY[] = [];
	const tangents: XY[] = [];
	let total = 0;
	for (let i = 0; i < n - 1; i++) {
		const dx = points[i + 1][0] - points[i][0];
		const dy = points[i + 1][1] - points[i][1];
		const d = Math.hypot(dx, dy);
		distances[i] = d || 0.0001;
		slopes[i] = d ? [dx / d, dy / d] : [0, 0];
		if (i > 1 && i < n - 3) total += distances[i];
	}
	for (let i = 2; i < n - 2; i++) {
		tangents[i] = [0, 0];
		for (const axis of [0, 1] as const) {
			const a = Math.abs(slopes[i + 1][axis] - slopes[i][axis]);
			const b = Math.abs(slopes[i - 1][axis] - slopes[i - 2][axis]);
			tangents[i][axis] = a + b === 0
				? (slopes[i][axis] + slopes[i - 1][axis]) / 2
				: (slopes[i - 1][axis] * a + slopes[i][axis] * b) / (a + b);
		}
	}
	const step = total / (count - (n - 4) - 1);
	let d = step;
	const output: XY[] = [];
	for (let i = 2; i < n - 3; i++) {
		const length = distances[i];
		output.push(points[i]);
		while (d < length && output.length < count - (n - i - 1)) {
			const p: XY = [0, 0];
			for (const axis of [0, 1] as const) {
				const slope = (points[i + 1][axis] - points[i][axis]) / length;
				const a = (tangents[i][axis] + tangents[i + 1][axis] - 2 * slope) / length ** 2;
				const b = (3 * slope - 2 * tangents[i][axis] - tangents[i + 1][axis]) / length;
				p[axis] = ((a * d + b) * d + tangents[i][axis]) * d + points[i][axis];
			}
			output.push(p);
			d += step;
		}
		d -= length;
	}
	while (output.length < count) output.push(points[n - 3]);
	return output;
};

/** 複合面は連結できる辺だけを閉じる。離れた端点を勝手につながない。 */
export const assembleShape = (lines: XY[][], tolerance: number): AnyGeometry => {
	const key = (p: XY) => `${Math.round(p[0] / tolerance)},${Math.round(p[1] / tolerance)}`;
	const endpoints = new Map<string, Set<number>>();
	const add = (p: XY, index: number) => {
		const k = key(p);
		const values = endpoints.get(k) ?? new Set<number>();
		values.add(index);
		endpoints.set(k, values);
	};
	lines.forEach((line, i) => {
		add(line[0], i);
		add(line[line.length - 1], i);
	});
	const used = new Set<number>();
	const rings: XY[][] = [];
	for (let i = 0; i < lines.length; i++) {
		if (used.has(i)) continue;
		const ring = [...lines[i]];
		used.add(i);
		while (key(ring[0]) !== key(ring[ring.length - 1])) {
			const end = key(ring[ring.length - 1]);
			const candidates = endpoints.get(end);
			let next: number | undefined;
			for (const candidate of candidates ?? []) {
				if (!used.has(candidate)) {
					next = candidate;
					break;
				}
			}
			if (next === undefined) throw new Error('DGNの複合面の境界が閉じていません');
			used.add(next);
			const edge = key(lines[next][0]) === end ? lines[next] : [...lines[next]].reverse();
			for (let j = 1; j < edge.length; j++) ring.push(edge[j]);
		}
		if (ring.length < 4) throw new Error('DGNの複合面の頂点数が不正です');
		ring[ring.length - 1] = ring[0];
		rings.push(ring);
	}
	if (!rings.length) throw new Error('DGNの複合面に境界がありません');
	// 一つの複合面の複数リングは包含関係で外周・穴に分ける。
	const area = (ring: XY[]) =>
		Math.abs(ring.reduce((sum, p, i) => {
			const q = ring[(i + 1) % ring.length];
			return sum + p[0] * q[1] - q[0] * p[1];
		}, 0));
	const contains = (ring: XY[], p: XY) => {
		let inside = false;
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			const a = ring[i], b = ring[j];
			if (
				(a[1] > p[1]) !== (b[1] > p[1])
				&& p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]
			) inside = !inside;
		}
		return inside;
	};
	const sorted = rings.map(ring => ({ ring, area: area(ring) })).sort((a, b) => b.area - a.area);
	const depths: number[] = [];
	const polygonForRing: XY[][][] = [];
	const polygons: XY[][][] = [];
	for (let i = 0; i < sorted.length; i++) {
		let parent = -1;
		for (let j = i - 1; j >= 0; j--) {
			if (contains(sorted[j].ring, sorted[i].ring[0])) {
				parent = j;
				break;
			}
		}
		depths[i] = parent < 0 ? 0 : depths[parent] + 1;
		if (depths[i] % 2 === 0) {
			polygonForRing[i] = [sorted[i].ring];
			polygons.push(polygonForRing[i]);
		} else {
			polygonForRing[i] = polygonForRing[parent];
			polygonForRing[i].push(sorted[i].ring);
		}
	}
	return polygons.length === 1
		? { type: 'Polygon', coordinates: polygons[0] }
		: { type: 'MultiPolygon', coordinates: polygons };
};
