import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { DMFeature } from '.';

type Ring = number[][];
const signedArea = (ring: Ring): number =>
	ring.slice(1).reduce((area, p, i) => area + ring[i][0] * p[1] - p[0] * ring[i][1], 0) / 2;
const bounds = (ring: Ring): number[] =>
	ring.reduce((box, point) => [
		Math.min(box[0], point[0]),
		Math.min(box[1], point[1]),
		Math.max(box[2], point[0]),
		Math.max(box[3], point[1])
	], [Infinity, Infinity, -Infinity, -Infinity]);
const cross = (a: number[], b: number[], c: number[]): number =>
	(b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

// 接触も交差として扱い、境界をまたぐ中庭を誤って穴にしない。
const ringsIntersect = (a: Ring, b: Ring): boolean => {
	for (let i = 1; i < a.length; i++) {
		for (let j = 1; j < b.length; j++) {
			const [p, q, r, s] = [a[i - 1], a[i], b[j - 1], b[j]];
			if (
				Math.max(p[0], q[0]) < Math.min(r[0], s[0])
				|| Math.max(r[0], s[0]) < Math.min(p[0], q[0])
				|| Math.max(p[1], q[1]) < Math.min(r[1], s[1])
				|| Math.max(r[1], s[1]) < Math.min(p[1], q[1])
			) continue;
			if (cross(p, q, r) * cross(p, q, s) <= 0 && cross(r, s, p) * cross(r, s, q) <= 0) {
				return true;
			}
		}
	}
	return false;
};

const inside = (point: number[], ring: Ring): boolean =>
	booleanPointInPolygon(point, { type: 'Polygon', coordinates: [ring] }, {
		ignoreBoundary: true
	});

export const attachCourtyardHoles = (features: DMFeature[]): DMFeature[] => {
	const buildings = features.filter(feature =>
		feature.geometry.type === 'Polygon'
		&& /^30\d{2}$/.test(feature.properties.classCode)
	);
	const groups = new Map<
		string,
		Array<{ feature: DMFeature; ring: Ring; box: number[]; area: number; }>
	>();
	for (const feature of buildings) {
		if (Number(feature.properties.figureType ?? 0) !== 0) continue;
		const ring = (feature.geometry.coordinates as Ring[])[0];
		const key = feature.properties.drawingId;
		const candidates = groups.get(key) ?? [];
		candidates.push({ feature, ring, box: bounds(ring), area: Math.abs(signedArea(ring)) });
		groups.set(key, candidates);
	}
	const consumed = new Set<DMFeature>();
	const holes = new Map<DMFeature, Ring[]>();
	for (const courtyard of buildings) {
		if (courtyard.properties.figureType !== 31) continue;
		const ring = (courtyard.geometry.coordinates as Ring[])[0];
		if (ring.length < 4 || signedArea(ring) === 0) continue;
		const box = bounds(ring);
		const candidates = (groups.get(courtyard.properties.drawingId) ?? [])
			.filter(outer =>
				outer.box[0] < box[0] && outer.box[1] < box[1]
				&& outer.box[2] > box[2] && outer.box[3] > box[3]
			)
			.sort((a, b) => a.area - b.area);
		for (const outer of candidates) {
			if (
				!ring.every(point => inside(point, outer.ring)) || ringsIntersect(ring, outer.ring)
			) continue;
			const existing = holes.get(outer.feature) ?? [];
			if (
				existing.some(hole =>
					ringsIntersect(hole, ring) || inside(ring[0], hole) || inside(hole[0], ring)
				)
			) break;
			const orientedRing = signedArea(ring) * signedArea(outer.ring) > 0
				? [...ring].reverse()
				: ring;
			holes.set(outer.feature, [...existing, orientedRing]);
			consumed.add(courtyard);
			break;
		}
	}
	return features.filter(feature => !consumed.has(feature)).map(feature => {
		const interiors = holes.get(feature);
		return interiors
			? {
				...feature,
				geometry: {
					...feature.geometry,
					coordinates: [...feature.geometry.coordinates as Ring[], ...interiors]
				}
			}
			: feature;
	});
};
