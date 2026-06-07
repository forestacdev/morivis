import { decompressBz2 } from '$routes/map/utils/formats/bz2-decompress';

export interface HritNavigationOffsets {
	line: number;
	coff: number;
	loff: number;
}

export interface HritObservationTime {
	line: number;
	timeMjd: number;
}

export interface HritMetadata {
	fileTypeCode: number;
	totalHeaderLength: number;
	dataFieldLengthBytes: number;
	bitsPerPixel: number;
	columns: number;
	lines: number;
	compressionFlag: number;
	projectionName: string;
	cfac: number;
	lfac: number;
	coff: number;
	loff: number;
	annotation: string;
	imageSegmentSequence: number;
	totalImageSegments: number;
	firstLineNumber: number;
	startColumn: number;
	startRow: number;
	maxColumn: number;
	maxRow: number;
	channelName: string;
	unit: string;
	physicalRange: {
		countMin: number;
		countMax: number;
		valueMin: number;
		valueMax: number;
	};
	nodata: number | null;
	offsets: HritNavigationOffsets[];
	observationTimes: HritObservationTime[];
	ancillaryText: string;
	riceCompression: {
		flags: number;
		pixelsPerBlock: number;
		pixelsPerScanline: number;
	} | null;
}

export interface ParsedHritRaster {
	metadata: HritMetadata;
	data: Float32Array;
	width: number;
	height: number;
	bbox: [number, number, number, number];
	nodata: number;
}

interface ParsedHritSegment {
	metadata: HritMetadata;
	rawCounts: Uint8Array | Uint16Array;
}

interface PixelPosition {
	column: number;
	row: number;
}

interface LonLat {
	lon: number;
	lat: number;
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const SCALING_DENOMINATOR = 2 ** 16;
const EARTH_EQUATORIAL_RADIUS_KM = 6378.137;
const EARTH_POLAR_RADIUS_KM = 6356.7523;
const SATELLITE_DISTANCE_KM = 42164;
const MAX_OUTPUT_WIDTH = 4096;
const MAX_OUTPUT_HEIGHT = 2048;
const MIN_OUTPUT_SIZE = 256;
const NODATA_VALUE = Number.NaN;

const EARTH_POLAR_RATIO =
	(EARTH_POLAR_RADIUS_KM * EARTH_POLAR_RADIUS_KM) /
	(EARTH_EQUATORIAL_RADIUS_KM * EARTH_EQUATORIAL_RADIUS_KM);
const EARTH_ECCENTRICITY_SQUARED =
	(EARTH_EQUATORIAL_RADIUS_KM * EARTH_EQUATORIAL_RADIUS_KM -
		EARTH_POLAR_RADIUS_KM * EARTH_POLAR_RADIUS_KM) /
	(EARTH_EQUATORIAL_RADIUS_KM * EARTH_EQUATORIAL_RADIUS_KM);
const EARTH_EQUATORIAL_OVER_POLAR =
	(EARTH_EQUATORIAL_RADIUS_KM * EARTH_EQUATORIAL_RADIUS_KM) /
	(EARTH_POLAR_RADIUS_KM * EARTH_POLAR_RADIUS_KM);

const parseAsciiPairs = (text: string): Record<string, string> => {
	const pairs: Record<string, string> = {};

	for (const line of text.split('\r')) {
		const separatorIndex = line.indexOf(':=');
		if (separatorIndex === -1) continue;
		const key = line.slice(0, separatorIndex).trim();
		const value = line.slice(separatorIndex + 2).trim();
		if (!key) continue;
		pairs[key] = value;
	}

	return pairs;
};

const parseLineValueBlocks = (text: string): Record<number, Record<string, number>> => {
	const rows: Record<number, Record<string, number>> = {};
	let currentLine: number | null = null;

	for (const line of text.split('\r')) {
		const separatorIndex = line.indexOf(':=');
		if (separatorIndex === -1) continue;

		const key = line.slice(0, separatorIndex).trim();
		const rawValue = line.slice(separatorIndex + 2).trim();
		const numericValue = Number(rawValue);

		if (key === 'LINE') {
			currentLine = numericValue;
			if (!rows[currentLine]) {
				rows[currentLine] = {};
			}
			continue;
		}

		if (currentLine === null || !Number.isFinite(numericValue)) continue;
		rows[currentLine][key] = numericValue;
	}

	return rows;
};

const normalizeLon = (lon: number) => {
	let normalized = lon;

	while (normalized <= -180) normalized += 360;
	while (normalized > 180) normalized -= 360;

	return normalized;
};

const parsePhysicalRange = (
	dataDefinitionText: string,
	bitsPerPixel: number,
	annotation: string,
	ancillaryText: string
): HritMetadata['physicalRange'] & { channelName: string; unit: string; nodata: number | null } => {
	const pairs = parseAsciiPairs(dataDefinitionText);
	const countMin = Number(Object.keys(pairs).find((key) => /^-?\d+$/.test(key)) ?? 0);
	const defaultCountMax = bitsPerPixel > 0 ? 2 ** bitsPerPixel - 1 : 255;
	const countMax = Number(
		Object.keys(pairs)
			.filter((key) => /^\d+$/.test(key))
			.map((key) => Number(key))
			.sort((a, b) => b - a)[0] ?? defaultCountMax
	);
	const valueMin = Number(pairs['0'] ?? 0);
	const valueMax = Number(pairs[String(countMax)] ?? countMax);
	const nodata = '65535' in pairs ? 65535 : null;
	const ancillaryChannel = ancillaryText.match(/Channel\s*=\s*([^;]+)/i)?.[1]?.trim();
	const annotationChannel = annotation.match(/chn([A-Za-z0-9]+)/i)?.[1]?.trim();

	return {
		countMin,
		countMax,
		valueMin,
		valueMax,
		channelName: pairs['_NAME'] ?? ancillaryChannel ?? annotationChannel ?? 'HRIT',
		unit: pairs['_UNIT'] ?? '',
		nodata
	};
};

const scaleCountToPhysical = (count: number, metadata: HritMetadata) => {
	if (metadata.nodata !== null && count === metadata.nodata) return NODATA_VALUE;
	if (count > metadata.physicalRange.countMax) return NODATA_VALUE;

	const { countMin, countMax, valueMin, valueMax } = metadata.physicalRange;
	if (countMax === countMin) return valueMin;

	const ratio = (count - countMin) / (countMax - countMin);
	return valueMin + (valueMax - valueMin) * ratio;
};

const readUint16ArrayBE = (buffer: ArrayBufferLike) => {
	const view = new DataView(buffer);
	const output = new Uint16Array(buffer.byteLength / 2);

	for (let i = 0; i < output.length; i++) {
		output[i] = view.getUint16(i * 2, false);
	}

	return output;
};

const readUint8Array = (buffer: ArrayBufferLike) => new Uint8Array(buffer);

const isLikelyRawHritBuffer = (buffer: Uint8Array) => {
	if (buffer.byteLength < 32) return false;
	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	const totalHeaderLength = view.getUint32(4, false);
	if (totalHeaderLength < 25) return false;
	const headerType = view.getUint8(16);
	const fileTypeCode = view.getUint8(3);
	const hasReasonableFileType = fileTypeCode === 0 || fileTypeCode === 1 || fileTypeCode === 2;
	return hasReasonableFileType && (headerType === 1 || headerType === 130 || headerType === 129);
};

export const isLikelyHritFile = async (file: File) => {
	const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
	if (head.byteLength >= 3 && head[0] === 0x42 && head[1] === 0x5a && head[2] === 0x68) {
		return true;
	}

	return isLikelyRawHritBuffer(head);
};

const parseHritMetadata = (buffer: ArrayBufferLike): HritMetadata => {
	const view = new DataView(buffer);
	const decoder = new TextDecoder('ascii');
	const fileTypeCode = view.getUint8(3);
	const totalHeaderLength = view.getUint32(4, false);
	const dataFieldLengthBytes = Number(view.getBigUint64(8, false) / 8n);

	let bitsPerPixel = 0;
	let columns = 0;
	let lines = 0;
	let compressionFlag = 0;
	let projectionName = '';
	let cfac = 0;
	let lfac = 0;
	let coff = 0;
	let loff = 0;
	let annotation = '';
	let imageSegmentSequence = 0;
	let totalImageSegments = 1;
	let firstLineNumber = 1;
	let startColumn = 0;
	let startRow = 0;
	let maxColumn = 0;
	let maxRow = 0;
	let dataDefinitionText = '';
	let compensationText = '';
	let observationTimeText = '';
	let ancillaryText = '';
	let riceCompression: HritMetadata['riceCompression'] = null;

	let offset = 16;
	while (offset < totalHeaderLength) {
		const headerType = view.getUint8(offset);
		const headerLength = view.getUint16(offset + 1, false);

		switch (headerType) {
			case 1:
				bitsPerPixel = view.getUint8(offset + 3);
				columns = view.getUint16(offset + 4, false);
				lines = view.getUint16(offset + 6, false);
				compressionFlag = view.getUint8(offset + 8);
				break;
			case 2:
				projectionName = decoder.decode(new Uint8Array(buffer, offset + 3, 32)).trimEnd();
				cfac = view.getInt32(offset + 35, false);
				lfac = view.getInt32(offset + 39, false);
				coff = view.getInt32(offset + 43, false);
				loff = view.getInt32(offset + 47, false);
				break;
			case 3:
				dataDefinitionText = decoder.decode(new Uint8Array(buffer, offset + 3, headerLength - 3));
				break;
			case 4:
				annotation = decoder.decode(new Uint8Array(buffer, offset + 3, headerLength - 3));
				break;
			case 6:
				ancillaryText = decoder.decode(new Uint8Array(buffer, offset + 3, headerLength - 3));
				break;
			case 128:
				if (headerLength >= 17) {
					imageSegmentSequence = view.getUint16(offset + 5, false);
					startColumn = view.getUint16(offset + 7, false);
					startRow = view.getUint16(offset + 9, false);
					totalImageSegments = view.getUint16(offset + 11, false);
					maxColumn = view.getUint16(offset + 13, false);
					maxRow = view.getUint16(offset + 15, false);
					firstLineNumber = startRow > 0 ? startRow : 1;
				} else {
					imageSegmentSequence = view.getUint8(offset + 3);
					totalImageSegments = view.getUint8(offset + 4);
					firstLineNumber = view.getUint16(offset + 5, false);
				}
				break;
			case 130:
				{
					const text = decoder.decode(new Uint8Array(buffer, offset + 3, headerLength - 3));
					if (text.includes('LINE:=') || text.includes('COFF:=') || text.includes('LOFF:=')) {
						compensationText = text;
					}
				}
				break;
			case 131:
				if (headerLength === 7) {
					riceCompression = {
						flags: view.getUint16(offset + 3, false),
						pixelsPerBlock: view.getUint8(offset + 5),
						pixelsPerScanline: view.getUint8(offset + 6)
					};
				} else {
					observationTimeText = decoder.decode(
						new Uint8Array(buffer, offset + 3, headerLength - 3)
					);
				}
				break;
		}

		offset += headerLength;
	}

	const parsedPhysicalRange = parsePhysicalRange(
		dataDefinitionText,
		bitsPerPixel,
		annotation,
		ancillaryText
	);
	const offsets = Object.entries(parseLineValueBlocks(compensationText))
		.map(([line, values]) => ({
			line: Number(line),
			coff: values.COFF ?? coff,
			loff: values.LOFF ?? loff
		}))
		.sort((a, b) => a.line - b.line);
	const observationTimes = Object.entries(parseLineValueBlocks(observationTimeText))
		.map(([line, values]) => ({
			line: Number(line),
			timeMjd: values.TIME ?? Number.NaN
		}))
		.filter((item) => Number.isFinite(item.timeMjd))
		.sort((a, b) => a.line - b.line);

	return {
		fileTypeCode,
		totalHeaderLength,
		dataFieldLengthBytes,
		bitsPerPixel,
		columns,
		lines,
		compressionFlag,
		projectionName,
		cfac,
		lfac,
		coff,
		loff,
		annotation,
		imageSegmentSequence,
		totalImageSegments,
		firstLineNumber,
		startColumn,
		startRow,
		maxColumn,
		maxRow,
		channelName: parsedPhysicalRange.channelName,
		unit: parsedPhysicalRange.unit,
		physicalRange: {
			countMin: parsedPhysicalRange.countMin,
			countMax: parsedPhysicalRange.countMax,
			valueMin: parsedPhysicalRange.valueMin,
			valueMax: parsedPhysicalRange.valueMax
		},
		nodata: parsedPhysicalRange.nodata,
		offsets,
		observationTimes,
		ancillaryText,
		riceCompression
	};
};

const pixelToLonLat = (column: number, row: number, metadata: HritMetadata): LonLat | null => {
	const projectionNameMatch = metadata.projectionName.match(/geos\(([-+]?\d+(?:\.\d+)?)\)/i);
	const subLonDeg = Number(projectionNameMatch?.[1] ?? 140.7);
	const subLonRad = subLonDeg * DEG2RAD;
	const x = ((column + 1 - metadata.coff) * SCALING_DENOMINATOR * DEG2RAD) / metadata.cfac;
	const y = ((row + 1 - metadata.loff) * SCALING_DENOMINATOR * DEG2RAD) / metadata.lfac;

	const cosX = Math.cos(x);
	const sinX = Math.sin(x);
	const cosY = Math.cos(y);
	const sinY = Math.sin(y);
	const a = cosY * cosY + EARTH_EQUATORIAL_OVER_POLAR * sinY * sinY;
	const b = -2 * SATELLITE_DISTANCE_KM * cosX * cosY;
	const c =
		SATELLITE_DISTANCE_KM * SATELLITE_DISTANCE_KM -
		EARTH_EQUATORIAL_RADIUS_KM * EARTH_EQUATORIAL_RADIUS_KM;
	const discriminant = b * b - 4 * a * c;

	if (discriminant <= 0) return null;

	const sd = Math.sqrt(discriminant);
	const sn = (SATELLITE_DISTANCE_KM * cosX * cosY - sd) / a;
	const s1 = SATELLITE_DISTANCE_KM - sn * cosX * cosY;
	const s2 = sn * sinX * cosY;
	const s3 = -sn * sinY;
	const lon = normalizeLon((subLonRad + Math.atan2(s2, s1)) * RAD2DEG);
	const lat =
		Math.atan(EARTH_EQUATORIAL_OVER_POLAR * (s3 / Math.sqrt(s1 * s1 + s2 * s2))) * RAD2DEG;

	return { lon, lat };
};

const lonLatToPixel = (lon: number, lat: number, metadata: HritMetadata): PixelPosition | null => {
	const projectionNameMatch = metadata.projectionName.match(/geos\(([-+]?\d+(?:\.\d+)?)\)/i);
	const subLonDeg = Number(projectionNameMatch?.[1] ?? 140.7);
	const subLonRad = subLonDeg * DEG2RAD;
	const latRad = lat * DEG2RAD;
	const lonRad = lon * DEG2RAD;
	let lonDiff = lonRad - subLonRad;

	while (lonDiff < -Math.PI) lonDiff += Math.PI * 2;
	while (lonDiff > Math.PI) lonDiff -= Math.PI * 2;

	const geocentricLat = Math.atan(EARTH_POLAR_RATIO * Math.tan(latRad));
	const re =
		EARTH_POLAR_RADIUS_KM /
		Math.sqrt(1 - EARTH_ECCENTRICITY_SQUARED * Math.cos(geocentricLat) ** 2);
	const r1 = SATELLITE_DISTANCE_KM - re * Math.cos(geocentricLat) * Math.cos(lonDiff);
	const r2 = -re * Math.cos(geocentricLat) * Math.sin(lonDiff);
	const r3 = re * Math.sin(geocentricLat);
	const rn = Math.sqrt(r1 * r1 + r2 * r2 + r3 * r3);

	if (
		SATELLITE_DISTANCE_KM * (SATELLITE_DISTANCE_KM - r1) <
		r2 * r2 + EARTH_EQUATORIAL_OVER_POLAR * r3 * r3
	) {
		return null;
	}

	const x = Math.atan2(-r2, r1);
	const y = Math.asin(-r3 / rn);

	return {
		column: metadata.coff + (x * RAD2DEG * metadata.cfac) / SCALING_DENOMINATOR - 1,
		row: metadata.loff + (y * RAD2DEG * metadata.lfac) / SCALING_DENOMINATOR - 1
	};
};

const resolveSegmentBbox = (metadata: HritMetadata) => {
	let minLon = Infinity;
	let maxLon = -Infinity;
	let minLat = Infinity;
	let maxLat = -Infinity;

	const rowStep = Math.max(1, Math.floor(metadata.lines / 64));
	const columnStep = Math.max(1, Math.floor(metadata.columns / 128));
	const rowStart = metadata.firstLineNumber - 1;

	for (let row = 0; row < metadata.lines; row += rowStep) {
		for (let column = 0; column < metadata.columns; column += columnStep) {
			const lonLat = pixelToLonLat(column, rowStart + row, metadata);
			if (!lonLat) continue;

			minLon = Math.min(minLon, lonLat.lon);
			maxLon = Math.max(maxLon, lonLat.lon);
			minLat = Math.min(minLat, lonLat.lat);
			maxLat = Math.max(maxLat, lonLat.lat);
		}
	}

	if (!Number.isFinite(minLon) || !Number.isFinite(minLat)) {
		throw new Error('HRIT画像の地理範囲を計算できませんでした');
	}

	const crossesAntimeridian = maxLon - minLon > 300;

	return {
		bbox: crossesAntimeridian
			? ([-180, minLat, 180, maxLat] as [number, number, number, number])
			: ([minLon, minLat, maxLon, maxLat] as [number, number, number, number]),
		crossesAntimeridian
	};
};

const resolveOutputSize = (
	sourceWidth: number,
	bbox: [number, number, number, number]
): { width: number; height: number } => {
	const lonSpan = Math.max(1e-6, bbox[2] - bbox[0]);
	const latSpan = Math.max(1e-6, bbox[3] - bbox[1]);
	const width = Math.min(MAX_OUTPUT_WIDTH, Math.max(MIN_OUTPUT_SIZE, sourceWidth));
	const height = Math.min(
		MAX_OUTPUT_HEIGHT,
		Math.max(MIN_OUTPUT_SIZE, Math.round((width * latSpan) / lonSpan))
	);

	return { width, height };
};

const resampleToLatLonGrid = (
	rawCounts: Uint8Array | Uint16Array,
	metadata: HritMetadata
): ParsedHritRaster => {
	const { bbox } = resolveSegmentBbox(metadata);
	const { width, height } = resolveOutputSize(metadata.columns, bbox);
	const output = new Float32Array(width * height).fill(NODATA_VALUE);
	const rowStart = metadata.firstLineNumber - 1;
	const lonSpan = bbox[2] - bbox[0];
	const latSpan = bbox[3] - bbox[1];

	for (let y = 0; y < height; y++) {
		const lat = bbox[3] - ((y + 0.5) / height) * latSpan;

		for (let x = 0; x < width; x++) {
			const lon = bbox[0] + ((x + 0.5) / width) * lonSpan;
			const sourcePixel = lonLatToPixel(lon, lat, metadata);
			if (!sourcePixel) continue;

			const sourceColumn = Math.round(sourcePixel.column);
			const sourceRow = Math.round(sourcePixel.row) - rowStart;

			if (
				sourceColumn < 0 ||
				sourceColumn >= metadata.columns ||
				sourceRow < 0 ||
				sourceRow >= metadata.lines
			) {
				continue;
			}

			const sourceIndex = sourceRow * metadata.columns + sourceColumn;
			const count = rawCounts[sourceIndex];
			output[y * width + x] = scaleCountToPhysical(count, metadata);
		}
	}

	return {
		metadata,
		data: output,
		width,
		height,
		bbox,
		nodata: NODATA_VALUE
	};
};

const readHritSegment = async (file: File): Promise<ParsedHritSegment> => {
	const input = new Uint8Array(await file.arrayBuffer());
	const isBz2 = /\.bz2$/i.test(file.name);
	const payload = isBz2 ? decompressBz2(input) : input;
	const hritBuffer = payload.buffer.slice(
		payload.byteOffset,
		payload.byteOffset + payload.byteLength
	);
	const metadata = parseHritMetadata(hritBuffer);

	if (metadata.fileTypeCode !== 0) {
		throw new Error('画像データではないHRITファイルです');
	}

	if (metadata.columns <= 0 || metadata.lines <= 0) {
		throw new Error('画像サイズが不正です');
	}

	const rawData = hritBuffer.slice(metadata.totalHeaderLength);
	if (rawData.byteLength !== metadata.dataFieldLengthBytes) {
		throw new Error('HRITデータ本体のサイズがヘッダ情報と一致しません');
	}

	const expectedPixels = metadata.columns * metadata.lines;
	const expectedBytesPerPixel = Math.ceil(metadata.bitsPerPixel / 8);
	const expectedDataLength = expectedPixels * expectedBytesPerPixel;

	if (metadata.bitsPerPixel === 8) {
		if (rawData.byteLength !== expectedPixels) {
			throw new Error(
				`未対応の8bit LRIT圧縮です: data=${rawData.byteLength}, expected=${expectedPixels}`
			);
		}

		return {
			metadata,
			rawCounts: readUint8Array(rawData)
		};
	}

	if (metadata.bitsPerPixel === 16) {
		if (rawData.byteLength !== expectedDataLength) {
			throw new Error(
				`未対応の16bit HRIT圧縮です: data=${rawData.byteLength}, expected=${expectedDataLength}`
			);
		}

		return {
			metadata,
			rawCounts: readUint16ArrayBE(rawData)
		};
	}

	throw new Error(`未対応のビット深度です: ${metadata.bitsPerPixel}`);
};

const mergeHritSegments = (segments: ParsedHritSegment[]): ParsedHritSegment => {
	if (segments.length === 0) {
		throw new Error('HRITセグメントがありません');
	}

	const sorted = [...segments].sort((a, b) => {
		const aRow = a.metadata.startRow > 0 ? a.metadata.startRow : a.metadata.imageSegmentSequence;
		const bRow = b.metadata.startRow > 0 ? b.metadata.startRow : b.metadata.imageSegmentSequence;
		return aRow - bRow;
	});
	const first = sorted[0];

	for (const segment of sorted.slice(1)) {
		if (
			segment.metadata.bitsPerPixel !== first.metadata.bitsPerPixel ||
			segment.metadata.columns !== first.metadata.columns ||
			segment.metadata.projectionName !== first.metadata.projectionName
		) {
			throw new Error('異なるHRITセグメントが混在しています');
		}
	}

	const mergedLines = sorted.reduce((sum, segment) => sum + segment.metadata.lines, 0);
	const pixels = first.metadata.columns * mergedLines;
	const mergedRawCounts =
		first.metadata.bitsPerPixel === 8 ? new Uint8Array(pixels) : new Uint16Array(pixels);

	let lineOffset = 0;
	for (const segment of sorted) {
		mergedRawCounts.set(segment.rawCounts, lineOffset * first.metadata.columns);
		lineOffset += segment.metadata.lines;
	}

	return {
		metadata: {
			...first.metadata,
			lines: mergedLines,
			firstLineNumber: 1,
			startRow: 0,
			imageSegmentSequence: sorted[0].metadata.imageSegmentSequence,
			totalImageSegments: first.metadata.totalImageSegments
		},
		rawCounts: mergedRawCounts
	};
};

export const parseHritRaster = async (file: File): Promise<ParsedHritRaster> => {
	const segment = await readHritSegment(file);
	return resampleToLatLonGrid(segment.rawCounts, segment.metadata);
};

export const parseHritRasterFiles = async (files: File[]): Promise<ParsedHritRaster> => {
	const segments = await Promise.all(files.map((file) => readHritSegment(file)));
	const merged = mergeHritSegments(segments);
	return resampleToLatLonGrid(merged.rawCounts, merged.metadata);
};
