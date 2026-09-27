import type { LasProjection } from '$routes/map/utils/formats/las';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { PointCloudUpAxis } from '../pointcloud/axis';

export const E57_MAX_FILE_BYTES = 256 * 1024 * 1024;
export const E57_MAX_SOURCE_POINTS = 5_000_000;
export const E57_MAX_DISPLAY_POINTS = 1_000_000;
export type E57Converter = (bytes: Uint8Array, format: string) => string;
export interface E57Result {
	positions: Float64Array;
	colors?: Uint8Array;
	bbox: [number, number, number, number];
	pointCount: number;
	sourcePointCount: number;
	scanCount: number;
	projection: LasProjection | null;
}

export const validateE57Size = (size: number) => {
	if (size > E57_MAX_FILE_BYTES) {
		throw new Error('E57は256 MiB以下のファイルに対応しています。分割して読み込んでください');
	}
	if (size < 48) throw new Error('E57のヘッダーが不足しています');
};

/** WASMで復号したスキャンはpose適用済み。重ねて変換しない。 */
export const parseE57 = (
	bytes: Uint8Array,
	convert: E57Converter,
	maxPoints = E57_MAX_DISPLAY_POINTS,
	upAxis: PointCloudUpAxis = 'z-up'
): E57Result => {
	validateE57Size(bytes.byteLength);
	if (new TextDecoder().decode(bytes.subarray(0, 8)) !== 'ASTM-E57') {
		throw new Error('E57のファイル識別子が不正です');
	}
	if (!Number.isSafeInteger(maxPoints) || maxPoints < 1 || maxPoints > E57_MAX_DISPLAY_POINTS) {
		throw new Error('E57の表示点数が不正です');
	}
	const xml = convert(bytes, 'XML');
	if (XMLValidator.validate(xml) !== true) throw new Error('E57のXMLメタデータが不正です');
	const metadata = new XMLParser({
		ignoreAttributes: false,
		parseTagValue: false,
		removeNSPrefix: true,
		// E57の標準要素名をJavaScriptの予約名と衝突させない。
		transformTagName: name => name === 'prototype' ? 'e57Prototype' : name
	}).parse(xml).e57Root;
	const children = metadata?.data3D?.vectorChild;
	const scans = children ? (Array.isArray(children) ? children : [children]) : [];
	if (!scans.length) throw new Error('E57に点群スキャンがありません');
	let recordCount = 0;
	for (const scan of scans) {
		const count = Number(scan.points?.['@_recordCount']);
		if (!Number.isSafeInteger(count) || count < 0) throw new Error('E57の点数が不正です');
		recordCount += count;
	}
	if (recordCount > E57_MAX_SOURCE_POINTS) {
		throw new Error('E57は500万点以下のファイルに対応しています。分割して読み込んでください');
	}
	if (!recordCount) throw new Error('E57に有効な点がありません');
	const crs = String(metadata.coordinateMetadata?.['#text'] ?? '').trim();
	const projection: LasProjection | null = crs
		? {
			epsg: null,
			definition: crs,
			coordinateType: /\b(?:PROJCS|PROJCRS)\s*\[/i.test(crs)
				? 'projected'
				: /\b(?:GEOGCS|GEOGCRS|GEODCRS)\s*\[/i.test(crs)
				? 'geographic'
				: 'unknown'
		}
		: null;
	// XYZ形式はスキャンごとにRGBの有無が異なる。行単位で3列/6列を扱う。
	const xyz = convert(bytes, 'XYZ');
	const stride = Math.max(1, Math.ceil(recordCount / maxPoints));
	const capacity = Math.ceil(recordCount / stride);
	const positions = new Float64Array(capacity * 3);
	const colors = new Uint8Array(capacity * 3).fill(255);
	let hasColors = false, validCount = 0, pointCount = 0;
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	const lines = /[^\r\n]+/g;
	let match: RegExpExecArray | null;
	while ((match = lines.exec(xyz))) {
		const values = match[0].trim().split(/\s+/).map(Number);
		if ((values.length !== 3 && values.length !== 6) || !values.every(Number.isFinite)) {
			throw new Error('E57の点群データを解釈できません');
		}
		// pose適用後に右手系を保ってZ-upへ変換する。間引き前に全域のbboxも求める。
		const x = values[0];
		const y = upAxis === 'y-up' ? -values[2] : values[1];
		const z = upAxis === 'y-up' ? values[1] : values[2];
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
		if (validCount >= recordCount) throw new Error('E57の点数がメタデータと一致しません');
		if (validCount++ % stride !== 0) continue;
		positions.set([x, y, z], pointCount * 3);
		if (values.length === 6) {
			hasColors = true;
			colors.set(
				values.slice(3).map(value => Math.round(Math.max(0, Math.min(255, value)))),
				pointCount * 3
			);
		}
		pointCount++;
	}
	if (!pointCount) throw new Error('E57に有効な点がありません');
	return {
		positions: positions.slice(0, pointCount * 3),
		colors: hasColors ? colors.slice(0, pointCount * 3) : undefined,
		bbox: [minX, minY, maxX, maxY],
		pointCount,
		sourcePointCount: validCount,
		scanCount: scans.length,
		projection
	};
};
