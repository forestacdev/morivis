import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import { formatOpenDrive } from './definition';
import { createBudget, createCurve, type Curve, sampleInterval, type XY } from './geometry';
import {
	children,
	node,
	num,
	parseXml,
	type Polynomial,
	polynomialAt,
	polynomials,
	str
} from './xml';

export interface OpenDriveResult {
	geojson: FeatureCollection;
	spatialStatus: 'resolved' | 'crs-missing';
	sourceCrs?: string;
	metadata: { name: string; version: string; roadCount: number; laneCount: number; };
	warnings: string[];
}
interface Lane {
	id: number;
	type: string;
	origin: number;
	width: Polynomial[];
	border: Polynomial[];
}

const readLanes = (group: unknown, sign: number, origin: number): Lane[] => {
	const lanes = children(node(group).lane).map(item => {
		const id = num(item, 'id');
		if (!Number.isInteger(id) || Math.sign(id) !== sign) {
			throw new Error('OpenDRIVEの車線IDと左右の区分が一致しません');
		}
		const width = polynomials(item.width, 'sOffset');
		const border = width.length ? [] : polynomials(item.border, 'sOffset');
		if (!(width.length || border.length) || (width[0] ?? border[0]).s !== 0) {
			throw new Error(`OpenDRIVEの車線${id}に開始位置0の幅・境界定義がありません`);
		}
		return { id, type: str(item, 'type', 'none'), origin, width, border };
	}).sort((a, b) => Math.abs(a.id) - Math.abs(b.id));
	if (lanes.some((lane, i) => Math.abs(lane.id) !== i + 1)) {
		throw new Error('OpenDRIVEの車線IDが連続していません');
	}
	return lanes;
};

const curveAt = (curves: Curve[], s: number): Curve => {
	let lo = 0, hi = curves.length;
	while (lo < hi) {
		const m = (lo + hi) >>> 1;
		if (curves[m].s <= s + 1e-9) lo = m + 1;
		else hi = m;
	}
	return curves[Math.max(0, lo - 1)];
};

/** 2Dの道路基準線と車線面。高さ・横断勾配・路面標示は平面表示へ適用しない。 */
export const parseOpenDrive = (text: string): OpenDriveResult => {
	const root = parseXml(text), header = node(root.header);
	const roads = children(root.road);
	if (!roads.length) throw new Error('OpenDRIVEに道路がありません');
	if (roads.length > formatOpenDrive.limits.maxFeatures) {
		throw new Error('OpenDRIVEの道路数が処理上限を超えています');
	}
	const budget = createBudget();
	const features: Feature[] = [];
	const warnings = new Set<string>();
	const ids = new Set<string>();
	const offset = node(header.offset);
	const ox = num(offset, 'x', 0), oy = num(offset, 'y', 0), angle = num(offset, 'hdg', 0);
	const transform = ([x, y]: XY): XY => {
		const point: XY = [
			x * Math.cos(angle) - y * Math.sin(angle) + ox,
			x * Math.sin(angle) + y * Math.cos(angle) + oy
		];
		if (!point.every(Number.isFinite)) {
			throw new Error('OpenDRIVEのオフセット適用後の座標が不正です');
		}
		return point;
	};
	const append = (feature: Feature) => {
		if (features.length >= formatOpenDrive.limits.maxFeatures) {
			throw new Error('OpenDRIVEの地物数が処理上限を超えています');
		}
		feature.id = features.length;
		features.push(feature);
	};
	let sectionCount = 0, laneCount = 0;
	for (const road of roads) {
		const id = str(road, 'id'), length = num(road, 'length');
		if (!id || ids.has(id)) throw new Error('OpenDRIVEの道路IDが空または重複しています');
		ids.add(id);
		if (length <= 0) throw new Error(`OpenDRIVEの道路${id}の長さが不正です`);
		const curves = children(node(road.planView).geometry).map(item =>
			createCurve(item, budget)
		);
		if (!curves.length || curves[0].s !== 0) {
			throw new Error(`OpenDRIVEの道路${id}に開始位置0のplanViewがありません`);
		}
		for (let i = 0; i < curves.length; i++) {
			const c = curves[i], next = curves[i + 1];
			if (Math.abs(c.s + c.length - (next?.s ?? length)) > Math.max(1e-5, length * 1e-7)) {
				throw new Error(`OpenDRIVEの道路${id}のplanViewに重複・隙間があります`);
			}
			if (next) {
				const a = c.at(c.length), b = next.at(0);
				if (Math.hypot(a.x - b.x, a.y - b.y) > 0.1) {
					throw new Error(`OpenDRIVEの道路${id}の曲線が接続していません`);
				}
			}
		}
		const properties = {
			road_id: id,
			road_name: str(road, 'name'),
			junction: str(road, 'junction', '-1'),
			road_length: length
		};
		const reference: XY[] = [];
		for (const curve of curves) {
			const samples = sampleInterval(curve.s, curve.s + curve.length, s => {
				const p = curve.at(s - curve.s);
				return [[p.x, p.y]];
			}, budget);
			for (const sample of samples.slice(reference.length ? 1 : 0)) {
				reference.push(transform(sample.points[0]));
			}
		}
		append({
			type: 'Feature',
			properties: { ...properties, kind: 'reference-line' },
			geometry: { type: 'LineString', coordinates: reference }
		});
		const lanesNode = node(road.lanes), offsets = polynomials(lanesNode.laneOffset);
		const sections = children(lanesNode.laneSection);
		sectionCount += sections.length;
		if (sectionCount > formatOpenDrive.limits.maxSections) {
			throw new Error('OpenDRIVEの車線区間数が処理上限を超えています');
		}
		if (!sections.length) warnings.add('車線定義のない道路は基準線だけを読み込みました。');
		let left: Lane[] = [], right: Lane[] = [];
		for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
			const section = sections[sectionIndex], start = num(section, 's');
			const end = sectionIndex + 1 < sections.length
				? num(sections[sectionIndex + 1], 's')
				: length;
			if (start < 0 || end <= start || end > length || (sectionIndex === 0 && start !== 0)) {
				throw new Error('OpenDRIVEの車線区間の開始位置が不正です');
			}
			const singleSide = ['true', '1'].includes(str(section, 'singleSide'));
			if (section.left !== undefined || !singleSide) left = readLanes(section.left, 1, start);
			if (section.right !== undefined || !singleSide) {
				right = readLanes(section.right, -1, start);
			}
			const lanes = [...left, ...right];
			if (!lanes.length) continue;
			if (offsets.length && lanes.some(lane => lane.border.length)) {
				throw new Error('OpenDRIVEのborderとlaneOffsetの併用には対応していません');
			}
			// 多項式の切替位置で区間を分け、境界の不連続を誤った斜線で接続しない。
			const knots = [
				...new Set([
					start,
					end,
					...curves.map(c => c.s),
					...offsets.map(p => p.s),
					...lanes.flatMap(lane =>
						[...lane.width, ...lane.border].map(p => lane.origin + p.s)
					)
				])
			].filter(s => s >= start && s <= end).sort((a, b) => a - b);
			const rings = lanes.map(() => ({
				inner: [] as XY[],
				outer: [] as XY[],
				visible: false
			}));
			for (let part = 0; part < knots.length - 1; part++) {
				const a = knots[part], b = knots[part + 1], curve = curveAt(curves, (a + b) / 2);
				// 区間末尾は左側の多項式で評価する。次の区間は新しい多項式で開始。
				const at = (s: number): XY[] => {
					const p = curve.at(s - curve.s);
					const lookup = s === b && b < end ? Math.max(a, b - 1e-7) : s;
					const center = polynomialAt(offsets, lookup);
					const point = (
						t: number
					): XY => [p.x - Math.sin(p.heading) * t, p.y + Math.cos(p.heading) * t];
					const output: XY[] = [];
					for (const side of [left, right]) {
						let inner = center;
						for (const lane of side) {
							const sign = Math.sign(lane.id);
							const width = lane.width.length
								? polynomialAt(lane.width, lookup - lane.origin)
								: undefined;
							if (width !== undefined && width < -1e-6) {
								throw new Error(`OpenDRIVEの車線${lane.id}の幅が負です`);
							}
							const outer = width !== undefined
								? inner + sign * Math.max(0, width)
								: polynomialAt(lane.border, lookup - lane.origin);
							if (sign * (outer - inner) < -1e-6) {
								throw new Error('OpenDRIVEの車線境界が内側の車線と交差しています');
							}
							output.push(point(inner), point(outer));
							inner = outer;
						}
					}
					return output;
				};
				const samples = sampleInterval(a, b, at, budget);
				for (let i = 0; i < lanes.length; i++) {
					const ring = rings[i];
					for (const sample of samples) {
						const inner = sample.points[2 * i], outer = sample.points[2 * i + 1];
						if (Math.hypot(outer[0] - inner[0], outer[1] - inner[1]) > 1e-6) {
							ring.visible = true;
						}
						ring.inner.push(transform(inner));
						ring.outer.push(transform(outer));
					}
				}
			}
			for (let i = 0; i < lanes.length; i++) {
				const lane = lanes[i], ring = rings[i];
				if (!ring.visible) continue;
				const coordinates = [...ring.inner, ...ring.outer.reverse(), ring.inner[0]];
				// GeoJSON外周は反時計回りに統一する。
				let area = 0;
				for (let j = 1; j < coordinates.length; j++) {
					area += (coordinates[j - 1][0] - coordinates[0][0])
							* (coordinates[j][1] - coordinates[0][1])
						- (coordinates[j][0] - coordinates[0][0])
							* (coordinates[j - 1][1] - coordinates[0][1]);
				}
				if (area < 0) coordinates.reverse();
				budget.vertex(1);
				append({
					type: 'Feature',
					properties: {
						...properties,
						kind: 'lane',
						lane_id: lane.id,
						lane_type: lane.type,
						section_s: start,
						section_end: end
					},
					geometry: { type: 'Polygon', coordinates: [coordinates] }
				});
				laneCount++;
			}
		}
		if (
			road.elevationProfile !== undefined || road.lateralProfile !== undefined
			|| road.surface !== undefined
		) warnings.add('標高・横断勾配・路面の凹凸は平面表示に反映していません。');
		if (road.objects !== undefined || road.signals !== undefined) {
			warnings.add('道路付属物・信号は表示対象に含めていません。');
		}
	}
	const geoReference = typeof header.geoReference === 'string'
		? header.geoReference
		: String(node(header.geoReference)['#text'] ?? '');
	return {
		geojson: { type: 'FeatureCollection', features },
		spatialStatus: 'crs-missing',
		sourceCrs: geoReference.trim() || undefined,
		metadata: {
			name: str(header, 'name'),
			version: `${str(header, 'revMajor', '1')}.${str(header, 'revMinor', '?')}`,
			roadCount: roads.length,
			laneCount
		},
		warnings: [...warnings]
	};
};
