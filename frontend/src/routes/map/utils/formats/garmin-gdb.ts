import type { FeatureCollection } from '$routes/map/types/geojson';
import type { PointGeometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

const GARMIN_SEMICIRCLE_SCALE = 180 / 2147483648;
// 参考:
// GDAL GPSBabel driver は gdb を直接パースせず、gpsbabel CLI と GPX を中継に使う。
// https://gdal.org/en/stable/drivers/vector/gpsbabel.html
// 実際の gdb 構造の手掛かりは GPSBabel の gdb.cc。
// そこでは "MsRc" + primary file format 0x66 をヘッダとして書き出している。
// https://sources.debian.org/src/gpsbabel/1.10.0%2Bds-1/gdb.cc
const GARMIN_GDB_SIGNATURE = 'MsRc';
const GARMIN_GDB_PRIMARY_FORMAT = 0x0066;
const MAX_RECORD_LENGTH = 4096;
const MIN_COORDINATE_SEARCH_OFFSET = 16;
const MAX_COORDINATE_SEARCH_OFFSET = 96;

const readInt32LE = (view: DataView, offset: number) => {
	return view.getInt32(offset, true);
};

const toDegreesFromSemicircle = (value: number) => {
	return value * GARMIN_SEMICIRCLE_SCALE;
};

const decodeNullTerminatedString = (
	decoder: TextDecoder,
	bytes: Uint8Array,
	offset: number,
	maxLength: number
) => {
	const end = Math.min(offset + maxLength, bytes.length);
	let cursor = offset;

	while (cursor < end && bytes[cursor] !== 0) {
		cursor += 1;
	}

	if (cursor <= offset) return '';

	return decoder.decode(bytes.subarray(offset, cursor)).trim();
};

const isPlausibleCoordinate = (lat: number, lon: number) => {
	return (
		Number.isFinite(lat) &&
		Number.isFinite(lon) &&
		Math.abs(lat) > 0.01 &&
		Math.abs(lon) > 0.01 &&
		lat >= -90 &&
		lat <= 90 &&
		lon >= -180 &&
		lon <= 180
	);
};

const findMapSourceHeaderEnd = (bytes: Uint8Array) => {
	const signatures = ['MapSource\0', 'BaseCamp\0'];

	for (const signature of signatures) {
		const encoded = new TextEncoder().encode(signature);

		for (let index = 0; index <= bytes.length - encoded.length; index += 1) {
			let matches = true;

			for (let offset = 0; offset < encoded.length; offset += 1) {
				if (bytes[index + offset] !== encoded[offset]) {
					matches = false;
					break;
				}
			}

			if (matches) {
				return index + encoded.length;
			}
		}
	}

	return -1;
};

const collectRecordCandidates = (bytes: Uint8Array) => {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const decoder = new TextDecoder('utf-8', { fatal: false });
	const headerEnd = findMapSourceHeaderEnd(bytes);
	if (headerEnd === -1) return [];

	const records: {
		name: string;
		candidates: Array<{ lat: number; lon: number }>;
		recordLength: number;
	}[] = [];

	let cursor = headerEnd;

	while (cursor + 4 <= bytes.length) {
		while (cursor < bytes.length && bytes[cursor] === 0) {
			cursor += 1;
		}

		if (cursor + 4 > bytes.length) break;

		const recordLength = view.getUint32(cursor, true);
		if (
			recordLength === 0 ||
			recordLength > MAX_RECORD_LENGTH ||
			cursor + 4 + recordLength > bytes.length
		) {
			cursor += 1;
			continue;
		}

		const name = decodeNullTerminatedString(
			decoder,
			bytes,
			cursor + 4,
			Math.min(recordLength, 64)
		);
		const candidates: Array<{ lat: number; lon: number }> = [];

		for (
			let relativeOffset = MIN_COORDINATE_SEARCH_OFFSET;
			relativeOffset <= Math.min(recordLength - 8, MAX_COORDINATE_SEARCH_OFFSET);
			relativeOffset += 1
		) {
			const lat = toDegreesFromSemicircle(readInt32LE(view, cursor + 4 + relativeOffset));
			const lon = toDegreesFromSemicircle(readInt32LE(view, cursor + 4 + relativeOffset + 4));

			if (!isPlausibleCoordinate(lat, lon)) continue;
			candidates.push({ lat, lon });
		}

		if (name !== '' && candidates.length > 0) {
			records.push({ name, candidates, recordLength });
		}

		cursor += 4 + recordLength;
	}

	return records;
};

const findDominantCoordinateCluster = (
	records: Array<{ candidates: Array<{ lat: number; lon: number }> }>
) => {
	const clusterCounts = new Map<string, number>();

	for (const record of records) {
		for (const candidate of record.candidates) {
			const key = `${Math.round(candidate.lat)}:${Math.round(candidate.lon)}`;
			clusterCounts.set(key, (clusterCounts.get(key) ?? 0) + 1);
		}
	}

	let dominantKey: string | null = null;
	let dominantCount = -1;
	for (const [key, count] of clusterCounts) {
		if (count <= dominantCount) continue;
		dominantKey = key;
		dominantCount = count;
	}

	if (!dominantKey) return null;

	const [lat, lon] = dominantKey.split(':').map(Number);
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

	return { lat, lon };
};

const pickBestCandidate = (
	dominantCluster: { lat: number; lon: number },
	candidates: Array<{ lat: number; lon: number }>
) => {
	return candidates.reduce((best, candidate) => {
		const bestDistance =
			(best.lat - dominantCluster.lat) ** 2 + (best.lon - dominantCluster.lon) ** 2;
		const candidateDistance =
			(candidate.lat - dominantCluster.lat) ** 2 + (candidate.lon - dominantCluster.lon) ** 2;

		return candidateDistance < bestDistance ? candidate : best;
	});
};

export const isGarminGdbFile = async (file: File) => {
	const header = new Uint8Array(await file.slice(0, 128).arrayBuffer());
	if (header.length < 6) return false;

	const signature = new TextDecoder('ascii', { fatal: false }).decode(header.subarray(0, 4));
	const primaryFormat = new DataView(
		header.buffer,
		header.byteOffset,
		header.byteLength
	).getUint16(4, true);

	return signature === GARMIN_GDB_SIGNATURE && primaryFormat === GARMIN_GDB_PRIMARY_FORMAT;
};

export const garminGdbFileToGeojson = async (
	file: File
): Promise<FeatureCollection<PointGeometry>> => {
	const bytes = new Uint8Array(await file.arrayBuffer());
	if (bytes.length < 6) {
		throw new Error('Garmin GDB としては短すぎます');
	}

	const signature = new TextDecoder('ascii', { fatal: false }).decode(bytes.subarray(0, 4));
	const primaryFormat = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(
		4,
		true
	);

	if (
		signature !== GARMIN_GDB_SIGNATURE ||
		primaryFormat !== GARMIN_GDB_PRIMARY_FORMAT
	) {
		throw new Error('Garmin GDB 形式ではありません');
	}

	const records = collectRecordCandidates(bytes);
	if (records.length === 0) {
		throw new Error('Garmin GDB から waypoint を抽出できませんでした');
	}

	const dominantCluster = findDominantCoordinateCluster(records);
	if (!dominantCluster) {
		throw new Error('Garmin GDB の座標クラスタを特定できませんでした');
	}

	const features: FeatureCollection<PointGeometry>['features'] = records.map((record) => {
		const coordinate = pickBestCandidate(dominantCluster, record.candidates);

		return {
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [coordinate.lon, coordinate.lat]
			},
			properties: {
				name: record.name,
				record_length: record.recordLength,
				source_format: 'garmin-gdb'
			} as unknown as FeatureProp
		};
	});

	return {
		type: 'FeatureCollection',
		features
	};
};
