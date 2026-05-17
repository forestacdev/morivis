import type { FeatureCollection } from '$routes/map/types/geojson';
import type {
	LineStringGeometry,
	PolygonGeometry,
	MultiPolygonGeometry
} from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

type JsonObject = Record<string, unknown>;
type TimeStampedGeometryType = 'MovingPoint' | 'MovingPolygon' | 'Trajectory';

export type MfDataType = 'track_points' | 'tracks' | 'polygons';

export type MfTemporalSummary = {
	geometryType: TimeStampedGeometryType;
	trackCount: number;
	pointCount: number;
	polygonCount: number;
	timestamps: string[];
};

type TimeSeriesValueMap = Record<string, unknown[]>;

type ParsedFeature = {
	geometryType: TimeStampedGeometryType;
	baseProperties: FeatureProp;
	timestamps: string[];
	coordinates: unknown[];
	seriesValues: TimeSeriesValueMap;
};

const asArray = <T>(value: T | T[] | undefined | null): T[] => {
	if (value == null) return [];
	return Array.isArray(value) ? value : [value];
};

const asObject = (value: unknown): JsonObject | null => {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : null;
};

const isFiniteNumber = (value: unknown): value is number => {
	return typeof value === 'number' && Number.isFinite(value);
};

const formatTime = (value: unknown): string | undefined => {
	if (typeof value !== 'string' || value.trim() === '') return undefined;

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	const jstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
	const year = jstTime.getUTCFullYear();
	const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
	const day = String(jstTime.getUTCDate()).padStart(2, '0');
	const hours = String(jstTime.getUTCHours()).padStart(2, '0');
	const minutes = String(jstTime.getUTCMinutes()).padStart(2, '0');
	const seconds = String(jstTime.getUTCSeconds()).padStart(2, '0');

	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
};

const cloneProperties = (value: unknown): FeatureProp => {
	const source = asObject(value);
	if (!source) return {} as FeatureProp;

	const entries = Object.entries(source).filter(
		([, propertyValue]) => !Array.isArray(propertyValue) && typeof propertyValue !== 'object'
	);
	return Object.fromEntries(entries) as FeatureProp;
};

const normalizeSeriesValues = (
	temporalProperties: unknown,
	fallbackTimestamps: string[]
): TimeSeriesValueMap => {
	const result: TimeSeriesValueMap = {};

	for (const item of asArray(temporalProperties)) {
		const temporalObject = asObject(item);
		if (!temporalObject) continue;

		const timestamps = asArray(temporalObject.datetimes)
			.map(formatTime)
			.filter((value): value is string => Boolean(value));
		const referenceLength = timestamps.length || fallbackTimestamps.length;

		for (const [key, value] of Object.entries(temporalObject)) {
			if (key === 'datetimes') continue;

			if (Array.isArray(value)) {
				result[key] = value.slice(0, referenceLength);
				continue;
			}

			const measure = asObject(value);
			if (!measure || !Array.isArray(measure.values)) continue;
			result[key] = measure.values.slice(0, referenceLength);
		}
	}

	return result;
};

const parsePointCoordinate = (value: unknown): [number, number] | null => {
	if (!Array.isArray(value) || value.length < 2) return null;
	const lon = value[0];
	const lat = value[1];
	if (!isFiniteNumber(lon) || !isFiniteNumber(lat)) return null;
	return [lon, lat];
};

const parsePolygonCoordinate = (
	value: unknown
): PolygonGeometry['coordinates'] | MultiPolygonGeometry['coordinates'] | null => {
	if (!Array.isArray(value) || value.length === 0) return null;

	const first = value[0];
	if (!Array.isArray(first) || first.length === 0) return null;

	const firstNested = first[0];
	if (!Array.isArray(firstNested) || firstNested.length === 0) return null;

	const firstCoordinate = firstNested[0];
	if (Array.isArray(firstCoordinate)) {
		return value as MultiPolygonGeometry['coordinates'];
	}

	return value as PolygonGeometry['coordinates'];
};

const getTrackPointAngle = (
	points: Array<{ lat: number; lon: number }>,
	pointIndex: number
): number | undefined => {
	const currentPoint = points[pointIndex];
	const nextPoint = points[pointIndex + 1];
	const previousPoint = points[pointIndex - 1];

	const toRadians = (value: number) => (value * Math.PI) / 180;
	const toDegrees = (value: number) => (value * 180) / Math.PI;
	const getBearing = (from: { lat: number; lon: number }, to: { lat: number; lon: number }) => {
		const fromLat = toRadians(from.lat);
		const toLat = toRadians(to.lat);
		const deltaLon = toRadians(to.lon - from.lon);
		const y = Math.sin(deltaLon) * Math.cos(toLat);
		const x =
			Math.cos(fromLat) * Math.sin(toLat) -
			Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);
		return (toDegrees(Math.atan2(y, x)) + 360) % 360;
	};

	if (currentPoint && nextPoint) return getBearing(currentPoint, nextPoint);
	if (previousPoint && currentPoint) return getBearing(previousPoint, currentPoint);
	return undefined;
};

const collectParsedFeatures = (value: unknown): ParsedFeature[] => {
	const node = asObject(value);
	if (!node) throw new Error('MF-JSON の JSON オブジェクトを読み取れません');

	if (node.type === 'FeatureCollection') {
		return asArray(node.features).flatMap((feature) => collectParsedFeatures(feature));
	}

	if (node.type !== 'Feature') {
		throw new Error('MF-JSON は Feature または FeatureCollection である必要があります');
	}

	const properties = cloneProperties(node.properties);
	const temporalGeometry = asObject(node.temporalGeometry);
	if (temporalGeometry) {
		const geometryType = temporalGeometry.type;
		const coordinates = asArray(temporalGeometry.coordinates);
		const timestamps = asArray(temporalGeometry.datetimes)
			.map(formatTime)
			.filter((time): time is string => Boolean(time));

		if (geometryType === 'MovingPoint') {
			return [
				{
					geometryType: 'MovingPoint',
					baseProperties: properties,
					timestamps,
					coordinates,
					seriesValues: normalizeSeriesValues(node.temporalProperties, timestamps)
				}
			];
		}

		if (geometryType === 'MovingPolygon') {
			return [
				{
					geometryType: 'MovingPolygon',
					baseProperties: properties,
					timestamps,
					coordinates,
					seriesValues: normalizeSeriesValues(node.temporalProperties, timestamps)
				}
			];
		}
	}

	const geometry = asObject(node.geometry);
	if (geometry?.type === 'LineString' && Array.isArray(geometry.coordinates)) {
		const timestamps = asArray(asObject(node.properties)?.datetimes)
			.map(formatTime)
			.filter((time): time is string => Boolean(time));
		const baseProperties = cloneProperties(node.properties);
		delete baseProperties.datetimes;

		const seriesValues: TimeSeriesValueMap = {};
		const rawProperties = asObject(node.properties);
		for (const [key, propertyValue] of Object.entries(rawProperties ?? {})) {
			if (key === 'datetimes' || !Array.isArray(propertyValue)) continue;
			seriesValues[key] = propertyValue;
		}

		return [
			{
				geometryType: 'Trajectory',
				baseProperties,
				timestamps,
				coordinates: geometry.coordinates,
				seriesValues
			}
		];
	}

	throw new Error('未対応の MF-JSON 形式です');
};

const getSeriesValue = (seriesValues: TimeSeriesValueMap, key: string, index: number): unknown => {
	const values = seriesValues[key];
	if (!values || index >= values.length) return undefined;
	return values[index];
};

const createPointProperties = (
	parsed: ParsedFeature,
	index: number,
	extra: FeatureProp = {}
): FeatureProp => {
	const props: Record<string, unknown> = {
		...parsed.baseProperties,
		...extra,
		time: parsed.timestamps[index],
		point_index: index,
		source_format: 'mf-json'
	};

	for (const key of Object.keys(parsed.seriesValues)) {
		const value = getSeriesValue(parsed.seriesValues, key, index);
		if (value !== undefined) props[key] = value;
	}

	return props as FeatureProp;
};

const createTrackProperties = (parsed: ParsedFeature, pointCount: number): FeatureProp => {
	const props: Record<string, unknown> = {
		...parsed.baseProperties,
		time: parsed.timestamps[0],
		point_count: pointCount,
		source_format: 'mf-json'
	};

	for (const key of Object.keys(parsed.seriesValues)) {
		const values = parsed.seriesValues[key];
		if (!values) continue;
		props[`${key}_series`] = values;
	}

	return props as FeatureProp;
};

export const isMfJsonText = (text: string): boolean => {
	try {
		const parsed = JSON.parse(text) as unknown;
		const node = asObject(parsed);
		if (!node) return false;

		if (node.type === 'FeatureCollection') {
			const firstFeature = asArray(node.features)[0];
			const firstObject = asObject(firstFeature);
			return Boolean(
				firstObject &&
					(asObject(firstObject.temporalGeometry) ||
						(asObject(firstObject.geometry)?.type === 'LineString' &&
							Array.isArray(asObject(firstObject.properties)?.datetimes)))
			);
		}

		return Boolean(
			node.type === 'Feature' &&
				(asObject(node.temporalGeometry) ||
					(asObject(node.geometry)?.type === 'LineString' &&
						Array.isArray(asObject(node.properties)?.datetimes)))
		);
	} catch {
		return false;
	}
};

export const isMfJsonFile = async (file: File): Promise<boolean> => {
	return isMfJsonText(await file.text());
};

export const inspectMfJsonFile = async (file: File): Promise<MfTemporalSummary> => {
	const parsedFeatures = collectParsedFeatures(JSON.parse(await file.text()) as unknown);
	const timestamps = new Set<string>();

	let trackCount = 0;
	let pointCount = 0;
	let polygonCount = 0;
	let geometryType: TimeStampedGeometryType = parsedFeatures[0]?.geometryType ?? 'Trajectory';

	for (const feature of parsedFeatures) {
		geometryType = feature.geometryType;
		for (const timestamp of feature.timestamps) timestamps.add(timestamp);

		if (feature.geometryType === 'MovingPolygon') {
			polygonCount += feature.coordinates.length;
			continue;
		}

		pointCount += feature.coordinates.length;
		if (feature.coordinates.length >= 2) trackCount += 1;
	}

	return {
		geometryType,
		trackCount,
		pointCount,
		polygonCount,
		timestamps: Array.from(timestamps).sort()
	};
};

export const mfJsonFileToGeojson = async (
	file: File,
	dataType: MfDataType
): Promise<FeatureCollection> => {
	const parsedFeatures = collectParsedFeatures(JSON.parse(await file.text()) as unknown);

	if (dataType === 'tracks') {
		const features = parsedFeatures
			.filter((parsed) => parsed.geometryType !== 'MovingPolygon')
			.map((parsed, featureIndex) => {
				const points = parsed.coordinates
					.map((coordinate) => parsePointCoordinate(coordinate))
					.filter((coordinate): coordinate is [number, number] => Boolean(coordinate));

				if (points.length < 2) return null;

				return {
					type: 'Feature' as const,
					id: featureIndex,
					geometry: {
						type: 'LineString' as const,
						coordinates: points
					},
					properties: createTrackProperties(parsed, points.length)
				};
			})
			.filter(
				(
					feature
				): feature is {
					type: 'Feature';
					id: number;
					geometry: LineStringGeometry;
					properties: FeatureProp;
				} => feature !== null
			);

		return {
			type: 'FeatureCollection',
			features
		};
	}

	if (dataType === 'polygons') {
		const features = parsedFeatures.flatMap((parsed, featureIndex) => {
			if (parsed.geometryType !== 'MovingPolygon') return [];

			return parsed.coordinates.flatMap((coordinate, timeIndex) => {
				const polygonCoordinates = parsePolygonCoordinate(coordinate);
				if (!polygonCoordinates) return [];

				const geometryType =
					Array.isArray(polygonCoordinates[0]?.[0]?.[0]) ? 'MultiPolygon' : 'Polygon';

				return [
					{
						type: 'Feature' as const,
						id: `${featureIndex}-${timeIndex}`,
						geometry: {
							type: geometryType,
							coordinates: polygonCoordinates
						},
						properties: createPointProperties(parsed, timeIndex, {
							geometry_kind: 'MovingPolygon'
						})
					}
				];
			});
		});

		return {
			type: 'FeatureCollection',
			features
		};
	}

	const features = parsedFeatures.flatMap((parsed, featureIndex) => {
		if (parsed.geometryType === 'MovingPolygon') return [];

		const pointRefs = parsed.coordinates
			.map((coordinate) => parsePointCoordinate(coordinate))
			.filter((coordinate): coordinate is [number, number] => Boolean(coordinate))
			.map(([lon, lat]) => ({ lon, lat }));

		return pointRefs.map((point, pointIndex) => ({
			type: 'Feature' as const,
			id: `${featureIndex}-${pointIndex}`,
			geometry: {
				type: 'Point' as const,
				coordinates: [point.lon, point.lat] as [number, number]
			},
			properties: {
				...createPointProperties(parsed, pointIndex, {
					geometry_kind: parsed.geometryType
				}),
				lat: point.lat,
				lon: point.lon,
				angle: getTrackPointAngle(pointRefs, pointIndex)
			} as FeatureProp
		}));
	});

	return {
		type: 'FeatureCollection',
		features
	};
};
