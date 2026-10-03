import './worker-compat';
import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import {
	type Cartesian3,
	Cartographic,
	CzmlDataSource,
	Ellipsoid,
	type Entity,
	JulianDate,
	Math as CesiumMath,
	Matrix3,
	Matrix4,
	type PolygonHierarchy,
	Transforms
} from '@cesium/engine';
import { czmlModelLimits, formatCzml } from './definition';
import { preloadCzmlInertial } from './inertial';
import type { CzmlModel } from './model-types';
import { prepareCzml } from './prepare';

export type CzmlDataType = 'points' | 'tracks' | 'lines' | 'polygons';
export interface CzmlResult {
	models: CzmlModel[];
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
	if (prepared.hasInertial) await preloadCzmlInertial(prepared.times);
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
		models: [],
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
	const models = new Map<string, CzmlModel>();
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
			for (const [timeIndex, time] of evaluationTimes.entries()) {
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
					const model = entity.model;
					if (model && model.show?.getValue(time) !== false) {
						const resource = model.uri?.getValue(time);
						const uri = typeof resource === 'string' ? resource : resource?.url;
						if (typeof uri === 'string' && uri.trim()) {
							const scale = model.scale?.getValue(time) ?? 1;
							if (!Number.isFinite(scale) || scale < 0) {
								throw new Error('CZMLモデルの縮尺が不正です');
							}
							const matrix = entity.computeModelMatrix(time, new Matrix4());
							if (!matrix) throw new Error('CZMLモデルの向きを計算できません');
							const enu = Transforms.eastNorthUpToFixedFrame(position);
							const local = Matrix4.multiply(
								Matrix4.inverseTransformation(enu, new Matrix4()),
								matrix,
								new Matrix4()
							);
							// CesiumのglTF既定値: Y-up/Z-forwardからZ-up/X-forwardへの補正。
							Matrix4.multiply(
								local,
								Matrix4.fromRotationTranslation(Matrix3.fromRotationX(Math.PI / 2)),
								local
							);
							Matrix4.multiply(
								local,
								Matrix4.fromRotationTranslation(Matrix3.fromRotationY(Math.PI / 2)),
								local
							);
							const rotation = Matrix3.toArray(
								Matrix4.getMatrix3(local, new Matrix3())
							);
							if (!rotation.every(Number.isFinite)) {
								throw new Error('CZMLモデルの向きが不正です');
							}
							const key = JSON.stringify([entity.id, uri]);
							let item = models.get(key);
							if (!item) {
								if (models.size >= czmlModelLimits.maxInstances) {
									throw new Error('CZMLのモデル数が128件を超えています');
								}
								item = {
									id: entity.id,
									name: entity.name ?? entity.id,
									uri,
									frames: []
								};
								models.set(key, item);
							}
							item.frames.push({
								timeIndex,
								position: [...point.xy, point.height],
								rotation,
								scale
							});
						}
					}

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
	result.models = [...models.values()];
	if (!features && !result.models.length) {
		throw new Error('CZMLから表示できる位置・ライン・ポリゴンが見つかりませんでした');
	}
	if (ignored) {
		result.warnings.push(`表示できる図形がない${ignored}件のエンティティを除外しました。`);
	}
	return result;
};
