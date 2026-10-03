import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import {
	type Cartesian3,
	Cartographic,
	CzmlDataSource,
	Ellipsoid,
	type Entity,
	JulianDate,
	Math as CesiumMath,
	type PolygonHierarchy
} from '@cesium/engine';
import { formatCzml } from './definition';
import { prepareCzml } from './prepare';

export type CzmlDataType = 'points' | 'tracks' | 'lines' | 'polygons';
export interface CzmlResult {
	points: FeatureCollection;
	tracks: FeatureCollection;
	lines: FeatureCollection;
	polygons: FeatureCollection;
	timestamps: string[];
	warnings: string[];
	name?: string;
}
const empty = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] });

export const parseCzml = async (text: string): Promise<CzmlResult> => {
	const prepared = prepareCzml(text);
	let source: CzmlDataSource;
	try {
		source = await CzmlDataSource.load(prepared.packets);
	} catch {
		throw new Error(
			'CZMLのパケットを解釈できませんでした。座標・時間区間・参照を確認してください'
		);
	}
	const times = prepared.times;
	const result: CzmlResult = {
		points: empty(),
		tracks: empty(),
		lines: empty(),
		polygons: empty(),
		timestamps: times.map(time => JulianDate.toIso8601(time, 3)),
		warnings: prepared.warnings,
		name: source.name
	};
	// 静的プロパティの評価用。日付のない地物の属性やタイムラインには出さない。
	const evaluationTimes = times.length ? times : [JulianDate.fromIso8601('2000-01-01T00:00:00Z')];
	if (source.entities.values.length * evaluationTimes.length > formatCzml.limits.maxFeatures) {
		throw new Error(
			'CZMLの地物数と時刻数の組み合わせが大きすぎます。ファイルを分割してください'
		);
	}
	let vertices = 0;
	let features = 0;
	const coordinate = (position: Cartesian3): { xy: [number, number]; height: number; } => {
		if (![position.x, position.y, position.z].every(Number.isFinite)) {
			throw new Error('CZMLに不正な座標が含まれています');
		}
		const point = Cartographic.fromCartesian(position, Ellipsoid.WGS84);
		if (!point || ![point.longitude, point.latitude, point.height].every(Number.isFinite)) {
			throw new Error('CZMLの座標を有効な経緯度へ変換できません');
		}
		vertices++;
		if (vertices > formatCzml.limits.maxVertices) {
			throw new Error('CZMLの変換後の座標が100万点を超えています');
		}
		return {
			xy: [CesiumMath.toDegrees(point.longitude), CesiumMath.toDegrees(point.latitude)],
			height: point.height
		};
	};
	const add = (
		kind: CzmlDataType,
		geometry: Feature['geometry'],
		properties: Feature['properties']
	) => {
		features++;
		if (features > formatCzml.limits.maxFeatures) {
			throw new Error('CZMLの変換後の地物が20万件を超えています');
		}
		result[kind].features.push({ type: 'Feature', geometry, properties });
	};
	const metadata = (entity: Entity): Feature['properties'] => {
		const values: Record<string, unknown> = prepared.attributes.get(entity.id) ?? {};
		const properties: Feature['properties'] = {};
		for (const [key, value] of Object.entries(values)) {
			if (
				typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number'
			) properties[key] = value;
		}
		return {
			...properties,
			source_format: 'czml',
			entity_id: entity.id,
			name: entity.name ?? entity.id
		};
	};
	let ignored = 0;
	try {
		for (const entity of source.entities.values) {
			const startCount = features;
			let track: [number, number][] = [];
			let trackStart: string | undefined;
			let trackEnd: string | undefined;
			let previousAvailability: unknown;
			let previousPositionInterval: unknown;
			let segment = 0;
			const finishTrack = () => {
				if (track.length >= 2 && trackStart && trackEnd) {
					add('tracks', { type: 'LineString', coordinates: track }, {
						source_format: 'czml',
						entity_id: entity.id,
						name: entity.name ?? entity.id,
						segment: segment++,
						point_count: track.length,
						start_time: trackStart,
						end_time: trackEnd
					});
				}
				track = [];
				trackStart = undefined;
				trackEnd = undefined;
			};
			for (const time of evaluationTimes) {
				if (!entity.isAvailable(time) || !entity.isShowing) {
					finishTrack();
					continue;
				}
				const iso = times.length ? JulianDate.toIso8601(time, 3) : undefined;
				const properties = { ...metadata(entity), ...(iso ? { time: iso } : {}) };
				const availability = entity.availability?.findIntervalContainingDate(time);
				const positionWithIntervals = entity.position as typeof entity.position & {
					intervals?: { findIntervalContainingDate: (time: JulianDate) => unknown; };
				};
				const positionInterval = positionWithIntervals?.intervals
					?.findIntervalContainingDate(time);
				if (
					availability !== previousAvailability
					|| positionInterval !== previousPositionInterval
				) finishTrack();
				previousAvailability = availability;
				previousPositionInterval = positionInterval;
				const position = entity.position?.getValue(time);
				if (position) {
					const point = coordinate(position);
					if (entity.point?.show?.getValue(time) !== false) {
						add('points', { type: 'Point', coordinates: point.xy }, {
							...properties,
							height: point.height
						});
					}
					if (
						!entity.position?.isConstant && iso
						&& entity.path?.show?.getValue(time) !== false
					) {
						if (trackEnd) {
							const previousTime = JulianDate.fromIso8601(trackEnd);
							const middle = JulianDate.addSeconds(
								previousTime,
								JulianDate.secondsDifference(time, previousTime) / 2,
								new JulianDate()
							);
							if (
								!entity.isAvailable(middle) || !entity.position?.getValue(middle)
								|| entity.path?.show?.getValue(middle) === false
							) finishTrack();
						}
						const previous = track[track.length - 1];
						if (previous && Math.abs(previous[0] - point.xy[0]) > 180) finishTrack();
						trackStart ??= iso;
						trackEnd = iso;
						track.push(point.xy);
					} else finishTrack();
				} else finishTrack();
				const line = entity.polyline;
				if (line && line.show?.getValue(time) !== false) {
					const positions: Cartesian3[] | undefined = line.positions?.getValue(time);
					if (positions) {
						if (positions.length < 2) {
							throw new Error('CZMLのラインには2点以上が必要です');
						}
						add('lines', {
							type: 'LineString',
							coordinates: positions.map(point => coordinate(point).xy)
						}, properties);
					}
				}
				const polygon = entity.polygon;
				if (polygon && polygon.show?.getValue(time) !== false) {
					const hierarchy: PolygonHierarchy | undefined = polygon.hierarchy?.getValue(
						time
					);
					if (hierarchy) {
						const ring = (positions: Cartesian3[]) => {
							if (positions.length < 3) {
								throw new Error('CZMLのポリゴンには3点以上が必要です');
							}
							const coordinates = positions.map(point => coordinate(point).xy);
							const first = coordinates[0],
								last = coordinates[coordinates.length - 1];
							if (first[0] !== last[0] || first[1] !== last[1]) {
								coordinates.push([...first]);
							}
							return coordinates;
						};
						const polygons: [number, number][][][] = [];
						const visit = (part: PolygonHierarchy, depth = 0) => {
							if (depth > 64) throw new Error('CZMLのポリゴン階層が深すぎます');
							polygons.push([
								ring(part.positions),
								...(part.holes ?? []).map(hole => ring(hole.positions))
							]);
							for (const hole of part.holes ?? []) {
								for (const island of hole.holes ?? []) {
									visit(island, depth + 1);
								}
							}
						};
						visit(hierarchy);
						add(
							'polygons',
							polygons.length === 1
								? { type: 'Polygon', coordinates: polygons[0] }
								: { type: 'MultiPolygon', coordinates: polygons },
							properties
						);
					}
				}
			}
			finishTrack();
			if (features === startCount) ignored++;
		}
	} finally {
		source.entities.removeAll();
	}
	if (!features) {
		throw new Error('CZMLから表示できる位置・ライン・ポリゴンが見つかりませんでした');
	}
	if (ignored) {
		result.warnings.push(`表示できる図形がない${ignored}件のエンティティを除外しました。`);
	}
	return result;
};
