import { getProjContext, isValidEpsg } from '$routes/map/utils/proj/dict';

const LAS_HEADER_SIZE_OFFSET = 94;
const LAS_POINT_DATA_OFFSET = 96;
const LAS_VLR_COUNT_OFFSET = 100;
const LAS_VLR_HEADER_SIZE = 54;
const LAS_VLR_USER_ID_OFFSET = 2;
const LAS_VLR_RECORD_ID_OFFSET = 18;
const LAS_VLR_RECORD_LENGTH_OFFSET = 20;
const GEOTIFF_KEY_DIRECTORY_RECORD_ID = 34735;
const WKT_COORDINATE_SYSTEM_RECORD_ID = 2112;
const PROJECTED_CRS_GEO_KEY = 3072;
const GEOGRAPHIC_CRS_GEO_KEY = 2048;
const PROJECTED_WKT_PATTERN = /\b(?:PROJCS|PROJCRS)\s*\[/i;
const GEOGRAPHIC_WKT_PATTERN = /\b(?:GEOGCS|GEOGCRS)\s*\[/i;

export interface LasProjection {
	epsg: number | null;
	definition: string;
	coordinateType: 'projected' | 'geographic' | 'unknown';
}

const decodeAscii = (bytes: Uint8Array) =>
	new TextDecoder('ascii').decode(bytes).replace(/\0.*$/, '').trim();

const getGeoKeyValue = (data: DataView, keyId: number): number | null => {
	if (data.byteLength < 8) return null;

	const keyCount = data.getUint16(6, true);
	for (let index = 0; index < keyCount; index += 1) {
		const offset = 8 + index * 8;
		if (offset + 8 > data.byteLength) return null;
		if (data.getUint16(offset, true) !== keyId) continue;
		const valueLocation = data.getUint16(offset + 2, true);
		const valueCount = data.getUint16(offset + 4, true);
		return valueLocation === 0 && valueCount === 1 ? data.getUint16(offset + 6, true) : null;
	}

	return null;
};

const getEpsgFromWkt = (wkt: string): number | null => {
	const codes = [...wkt.matchAll(/(?:AUTHORITY|ID)\s*\[\s*["']EPSG["']\s*,\s*["']?(\d+)/gi)]
		.map((match) => Number(match[1]))
		.filter(Number.isInteger);
	return codes.at(-1) ?? null;
};

const getProjectionDefinition = (epsg: number): string | null => {
	const code = String(epsg);
	if (isValidEpsg(code)) return getProjContext(code);

	if (epsg >= 32601 && epsg <= 32660) {
		return `+proj=utm +zone=${epsg - 32600} +datum=WGS84 +units=m +no_defs`;
	}

	if (epsg >= 32701 && epsg <= 32760) {
		return `+proj=utm +zone=${epsg - 32700} +south +datum=WGS84 +units=m +no_defs`;
	}

	return null;
};

/** LAS 1.x の VLR に埋め込まれた GeoTIFF/WKT 座標系を取得する。 */
export const getLasProjection = (buffer: ArrayBuffer): LasProjection | null => {
	if (buffer.byteLength < LAS_VLR_COUNT_OFFSET + 4) return null;

	const bytes = new Uint8Array(buffer);
	if (decodeAscii(bytes.subarray(0, 4)) !== 'LASF') return null;

	const header = new DataView(buffer);
	const headerSize = header.getUint16(LAS_HEADER_SIZE_OFFSET, true);
	const pointDataOffset = header.getUint32(LAS_POINT_DATA_OFFSET, true);
	const vlrCount = header.getUint32(LAS_VLR_COUNT_OFFSET, true);
	if (headerSize > pointDataOffset || pointDataOffset > buffer.byteLength) return null;

	let offset = headerSize;
	let epsg: number | null = null;
	let wkt: string | null = null;
	let coordinateType: LasProjection['coordinateType'] = 'unknown';

	for (let index = 0; index < vlrCount; index += 1) {
		if (offset + LAS_VLR_HEADER_SIZE > pointDataOffset) return null;

		const vlr = new DataView(buffer, offset, LAS_VLR_HEADER_SIZE);
		const userId = decodeAscii(
			bytes.subarray(offset + LAS_VLR_USER_ID_OFFSET, offset + LAS_VLR_USER_ID_OFFSET + 16)
		);
		const recordId = vlr.getUint16(LAS_VLR_RECORD_ID_OFFSET, true);
		const recordLength = vlr.getUint16(LAS_VLR_RECORD_LENGTH_OFFSET, true);
		const dataOffset = offset + LAS_VLR_HEADER_SIZE;
		const nextOffset = dataOffset + recordLength;
		if (nextOffset > pointDataOffset) return null;

		if (userId === 'LASF_Projection' && recordId === GEOTIFF_KEY_DIRECTORY_RECORD_ID) {
			const geoKeys = new DataView(buffer, dataOffset, recordLength);
			const projectedEpsg = getGeoKeyValue(geoKeys, PROJECTED_CRS_GEO_KEY);
			const geographicEpsg = getGeoKeyValue(geoKeys, GEOGRAPHIC_CRS_GEO_KEY);
			if (projectedEpsg) {
				epsg = projectedEpsg;
				coordinateType = 'projected';
			} else if (geographicEpsg) {
				epsg = geographicEpsg;
				coordinateType = 'geographic';
			}
		}
		if (userId === 'LASF_Projection' && recordId === WKT_COORDINATE_SYSTEM_RECORD_ID) {
			wkt = decodeAscii(bytes.subarray(dataOffset, nextOffset));
		}

		offset = nextOffset;
	}

	const resolvedEpsg = epsg ?? (wkt ? getEpsgFromWkt(wkt) : null);
	if (coordinateType === 'unknown' && wkt) {
		if (PROJECTED_WKT_PATTERN.test(wkt)) {
			coordinateType = 'projected';
		} else if (GEOGRAPHIC_WKT_PATTERN.test(wkt)) {
			coordinateType = 'geographic';
		}
	}
	const definition = resolvedEpsg ? getProjectionDefinition(resolvedEpsg) : null;
	if (definition) return { epsg: resolvedEpsg, definition, coordinateType };
	if (wkt) return { epsg: resolvedEpsg, definition: wkt, coordinateType };

	return null;
};
