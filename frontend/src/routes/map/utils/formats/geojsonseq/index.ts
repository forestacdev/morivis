/**
 * Format spec:
 * - https://www.rfc-editor.org/rfc/rfc8142
 * - https://www.rfc-editor.org/rfc/rfc7946
 *
 * References:
 * - https://gdal.org/en/stable/drivers/vector/geojsonseq.html
 */
import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry } from '$routes/map/types/geometry';

const RS = '\u001e';
const COORDINATE_DEPTHS: Record<string, number> = {
	Point: 0,
	MultiPoint: 1,
	LineString: 1,
	MultiLineString: 2,
	Polygon: 2,
	MultiPolygon: 3
};

export class GeoJsonSequenceParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GeoJsonSequenceParseError';
	}
}

const isObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === 'object' && !Array.isArray(value);

const isCoordinates = (value: unknown, depth: number): boolean =>
	Array.isArray(value) && (depth === 0
		? value.length >= 2
			&& value.every(ordinate => typeof ordinate === 'number' && Number.isFinite(ordinate))
		: value.length > 0 && value.every(child => isCoordinates(child, depth - 1)));

/** 通常の整形済みGeoJSONと、行ごとに完結したGeoJSONを区別する。 */
export const isGeoJsonSequenceText = (text: string): boolean => {
	const trimmed = text.trimStart();
	if (trimmed.startsWith(RS)) return true;
	const newline = trimmed.indexOf('\n');
	if (newline < 0 || !trimmed.slice(newline + 1).trim()) return false;
	try {
		const first: unknown = JSON.parse(trimmed.slice(0, newline));
		return isObject(first) && typeof first.type === 'string'
			&& (Object.hasOwn(COORDINATE_DEPTHS, first.type)
				|| ['Feature', 'FeatureCollection', 'GeometryCollection'].includes(first.type));
	} catch {
		return false;
	}
};

/** 全レコードを検証してから返す。途中の破損を無視した部分登録はしない。 */
export const geoJsonSequenceTextToGeoJson = (text: string): FeatureCollection => {
	const input = text.replace(/^\uFEFF/, '');
	const hasRs = input.includes(RS);
	if (hasRs && input.slice(0, input.indexOf(RS)).trim()) {
		throw new GeoJsonSequenceParseError(
			'GeoJSONSeq: 最初のレコード区切りの前にデータがあります'
		);
	}
	const records = hasRs ? input.split(RS).slice(1) : input.split('\n');
	const features: Feature[] = [];
	for (const [index, record] of records.entries()) {
		if (!record.trim()) continue;
		const location = hasRs ? `レコード${index + 1}` : `${index + 1}行目`;
		const fail = (message: string): never => {
			throw new GeoJsonSequenceParseError(`GeoJSONSeq: ${location}の${message}`);
		};
		let value: unknown;
		try {
			value = JSON.parse(record);
		} catch {
			fail('JSON構文が壊れています');
		}

		const appendGeometry = (
			geometry: unknown,
			properties: Feature['properties'],
			id?: string | number
		): void => {
			if (!isObject(geometry) || typeof geometry.type !== 'string') {
				fail('ジオメトリが不正です');
				return;
			}
			if (geometry.type === 'GeometryCollection') {
				if (!Array.isArray(geometry.geometries)) {
					fail('geometriesは配列で指定してください');
					return;
				}
				geometry.geometries.forEach((child, childIndex) =>
					appendGeometry(
						child,
						properties,
						id === undefined ? undefined : `${id}_${childIndex}`
					)
				);
				return;
			}
			if (
				!Object.hasOwn(COORDINATE_DEPTHS, geometry.type)
				|| !isCoordinates(geometry.coordinates, COORDINATE_DEPTHS[geometry.type])
			) {
				fail('ジオメトリの種類または座標が不正です');
			}
			features.push({
				type: 'Feature',
				...(id === undefined ? {} : { id }),
				properties,
				geometry: geometry as AnyGeometry
			});
		};
		const appendObject = (object: unknown, featureOnly = false): void => {
			if (!isObject(object) || typeof object.type !== 'string') {
				fail('GeoJSONオブジェクトが不正です');
				return;
			}
			if (featureOnly && object.type !== 'Feature') {
				fail('featuresにはFeatureを指定してください');
			}
			if (object.type === 'FeatureCollection') {
				if (!Array.isArray(object.features)) {
					fail('featuresは配列で指定してください');
					return;
				}
				object.features.forEach(feature => appendObject(feature, true));
			} else if (object.type === 'Feature') {
				if (object.properties !== null && !isObject(object.properties)) {
					fail('propertiesはオブジェクトまたはnullで指定してください');
				}
				if (
					object.id !== undefined && typeof object.id !== 'string'
					&& typeof object.id !== 'number'
				) {
					fail('idは文字列または数値で指定してください');
				}
				// 位置のない地物は描画できないため、登録対象から除く。
				if (object.geometry === null) return;
				appendGeometry(
					object.geometry,
					(object.properties ?? {}) as Feature['properties'],
					object.id as string | number | undefined
				);
			} else {
				appendGeometry(object, {});
			}
		};
		appendObject(value);
	}
	if (features.length === 0) {
		throw new GeoJsonSequenceParseError('GeoJSONSeq: 表示できる地物がありません');
	}
	return { type: 'FeatureCollection', features };
};
