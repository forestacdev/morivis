// DGNLib/GDALのV7読み取り処理を参照したTypeScript実装。
// 著作権・許諾表示: THIRD_PARTY_NOTICES.md
import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry } from '$routes/map/types/geometry';
import { readAttributes } from './attributes';
import { readInt32, readUnitName, readVaxDouble, requireBytes } from './binary';
import { formatDgn } from './definition';
import { checkDgnSize, validateDgnBytes } from './files';
import { assembleShape, strokeCurve, type XY } from './geometry';
import { DEFAULT_DGN_COLORS } from './palette';

export interface DgnMetadata {
	dimension: 2 | 3;
	masterUnit: string;
	subUnit: string;
	subUnitsPerMaster: number;
	uorPerSubUnit: number;
	origin: [number, number, number];
}

export interface DgnParseOptions {
	/** XYの主単位を受け取る。指定しなければローカル座標のまま。 */
	project?: (point: XY) => XY;
}

const CONTROL_TYPES = new Set([
	0,
	1,
	2,
	5,
	7,
	8,
	9,
	10,
	24,
	25,
	26,
	27,
	28,
	32,
	37,
	44,
	48,
	49,
	50,
	51,
	57,
	60,
	61,
	62,
	63,
	66
]);

/** 入力を走査し、2Dベクターを直接生成する。全要素の中間オブジェクトは保持しない。 */
export const parseDgn = (bytes: Uint8Array, options: DgnParseOptions = {}) => {
	checkDgnSize({ size: bytes.byteLength });
	validateDgnBytes(bytes);
	const header = new DataView(bytes.buffer, bytes.byteOffset, 1536);
	const dimension = header.getUint8(1214) & 0x40 ? 3 : 2;
	const subUnitsPerMaster = readInt32(header, 1112);
	const uorPerSubUnit = readInt32(header, 1116);
	if (subUnitsPerMaster <= 0 || uorPerSubUnit <= 0) throw new Error('DGNの単位倍率が不正です');
	const scale = 1 / (subUnitsPerMaster * uorPerSubUnit);
	const origin: [number, number, number] = [
		readVaxDouble(header, 1240) * scale,
		readVaxDouble(header, 1248) * scale,
		readVaxDouble(header, 1256) * scale
	];
	const metadata: DgnMetadata = {
		dimension,
		masterUnit: readUnitName(header, 1120),
		subUnit: readUnitName(header, 1122),
		subUnitsPerMaster,
		uorPerSubUnit,
		origin
	};
	let colors: readonly string[] = DEFAULT_DGN_COLORS;
	let offset = 0;
	let elementId = 0;
	let vertices = 0;
	let outputBytes = 42; // FeatureCollectionのラッパー
	let omittedCount = 0;
	let approximatedCount = 0;
	const unsupportedTypes: Record<number, number> = {};
	const features: Feature[] = [];
	const encoder = new TextEncoder();
	const reserve = (count: number) => {
		vertices += count;
		if (vertices > formatDgn.limits.maxVertices) {
			throw new Error('DGNは500万頂点以下にしてください');
		}
	};
	const point = (x: number, y: number): XY => [x * scale - origin[0], y * scale - origin[1]];
	const projectGeometry = (geometry: AnyGeometry) => {
		if (!options.project) return;
		const visit = (coordinates: unknown): unknown => {
			const values = coordinates as XY | unknown[];
			if (typeof values[0] === 'number') {
				const p = options.project!([values[0], values[1] as number]);
				if (!p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) {
					throw new Error('変換後の座標が緯度経度の範囲外です。座標系を確認してください');
				}
				return p;
			} else return values.map(visit);
		};
		geometry.coordinates = visit(geometry.coordinates) as typeof geometry.coordinates;
	};
	const emit = (feature: Feature) => {
		if (features.length >= formatDgn.limits.maxFeatures) {
			throw new Error('DGNは50万地物以下にしてください');
		}
		projectGeometry(feature.geometry);
		outputBytes += encoder.encode(JSON.stringify(feature)).byteLength + 1;
		if (outputBytes > formatDgn.limits.maxOutputBytes) {
			throw new Error('DGNの展開結果が128 MiBを超えました。図面を分割してください');
		}
		features.push(feature);
	};
	const readElement = (depth = 0): Feature | null => {
		if (depth > 20) throw new Error('DGNの複合図形の階層が深すぎます');
		if (offset + 4 > bytes.length || (bytes[offset] === 255 && bytes[offset + 1] === 255)) {
			throw new Error('DGNの複合図形の子要素が欠損しています');
		}
		const start = offset;
		const size = 4 + (bytes[start + 2] + bytes[start + 3] * 256) * 2;
		const raw = bytes.subarray(start, start + size);
		const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
		const type = raw[1] & 0x7f;
		const level = raw[0] & 0x3f;
		const id = elementId++;
		offset += size;
		if (raw[1] & 0x80) {
			// 削除済みの親の後ろに残った子図形も表示しない。
			if ([2, 7, 12, 14, 18, 19].includes(type)) {
				requireBytes(view, 36, 2);
				const end = start + 38 + view.getUint16(36, true) * 2;
				if (end < offset || end > bytes.length) {
					throw new Error('DGNの削除済み図形の長さが不正です');
				}
				while (offset < end) {
					if (offset + 4 > end || !(bytes[offset] & 0x80)) {
						throw new Error('DGNの削除済み図形の子要素が不正です');
					}
					offset += 4 + (bytes[offset + 2] + bytes[offset + 3] * 256) * 2;
					elementId++;
				}
				if (offset !== end) throw new Error('DGNの削除済み図形の境界が不正です');
			}
			return null;
		}
		if (type === 5 && level === 1) {
			requireBytes(view, 38, 768);
			const rgb = (p: number) =>
				`#${
					Array.from(raw.subarray(p, p + 3), v => v.toString(16).padStart(2, '0')).join(
						''
					)
				}`;
			colors = Array.from({ length: 256 }, (_, i) => rgb(i === 255 ? 38 : 41 + i * 3));
			return null;
		}
		if (CONTROL_TYPES.has(type)) return null;
		if (![3, 4, 6, 11, 12, 14, 15, 16, 17, 21].includes(type)) {
			omittedCount++;
			unsupportedTypes[type] = (unsupportedTypes[type] ?? 0) + 1;
			return null;
		}
		requireBytes(view, 0, 36);
		const flags = view.getUint16(32, true);
		const attrStart = flags & 0x0800 ? 32 + view.getUint16(30, true) * 2 : size;
		if (attrStart < 36 || attrStart > size) throw new Error('DGNの属性位置が不正です');
		const attrs = readAttributes(raw.subarray(attrStart));
		const body = new DataView(raw.buffer, raw.byteOffset, attrStart);
		const properties = {
			Type: type,
			Level: level,
			GraphicGroup: view.getUint16(28, true),
			ColorIndex: raw[35],
			Weight: (raw[34] >>> 3) & 31,
			Style: raw[34] & 7,
			layer: String(level),
			type: String(type),
			color: colors[raw[35]],
			...attrs.properties
		};
		let geometry: AnyGeometry;
		if ([3, 4, 6, 11, 21].includes(type)) {
			requireBytes(body, 36, type === 3 ? dimension * 8 : 2);
			const count = type === 3 ? 2 : body.getUint16(36, true);
			const first = type === 3 ? 36 : 38;
			if (count < (type === 6 ? 3 : 2)) throw new Error('DGNの図形の頂点数が不正です');
			requireBytes(body, first, count * dimension * 4);
			reserve(type === 11 ? count * 5 : count + (type === 6 ? 1 : 0));
			let points: XY[] = Array.from({ length: count }, (_, i) => {
				const p = first + i * dimension * 4;
				const [dx, dy] = attrs.delta(i);
				return point(readInt32(body, p) + dx, readInt32(body, p + 4) + dy);
			});
			if (type === 11) points = strokeCurve(points);
			if (type === 21) approximatedCount++;
			if (type === 6) {
				const a = points[0], b = points[points.length - 1];
				if (a[0] !== b[0] || a[1] !== b[1]) points.push([...a]);
				geometry = { type: 'Polygon', coordinates: [points] };
			} else geometry = { type: 'LineString', coordinates: points };
		} else if (type === 15 || type === 16) {
			const arc = type === 16;
			const base = arc ? 44 : 36;
			const centerOffset = base + (dimension === 2 ? 20 : 32);
			requireBytes(body, centerOffset, dimension * 8);
			const major = readVaxDouble(body, base) * scale;
			const minor = readVaxDouble(body, base + 8) * scale;
			if (major <= 0 || minor <= 0) throw new Error('DGNの円弧の半径が不正です');
			const center = point(
				readVaxDouble(body, centerOffset),
				readVaxDouble(body, centerOffset + 8)
			);
			const startAngle = arc ? readInt32(body, 36) / 360000 : 0;
			const sweepRaw = arc ? readInt32(body, 40) >>> 0 : 0;
			const sweepAngle = sweepRaw === 0
				? 360
				: (sweepRaw & 0x7fffffff) / 360000 * (sweepRaw & 0x80000000 ? -1 : 1);
			if (Math.abs(sweepAngle) > 360) throw new Error('DGNの円弧の角度が不正です');
			const rotation = dimension === 2
				? readInt32(body, base + 16) / 360000 * Math.PI / 180
				: 0;
			let xx = Math.cos(rotation),
				xy = -Math.sin(rotation),
				yx = Math.sin(rotation),
				yy = Math.cos(rotation);
			if (dimension === 3) {
				const q = Array.from(
					{ length: 4 },
					(_, i) => readInt32(body, base + 16 + i * 4) / 2147483647
				);
				const norm = Math.hypot(...q);
				if (!norm) throw new Error('DGNの3D回転が不正です');
				const [w, x, y, z] = q.map(v => v / norm);
				// DGNのquaternionは通常の能動回転と逆向き。
				xx = 1 - 2 * (y * y + z * z);
				xy = 2 * (x * y + z * w);
				yx = 2 * (x * y - z * w);
				yy = 1 - 2 * (x * x + z * z);
			}
			const count = Math.min(90, Math.floor(Math.max(1, Math.abs(sweepAngle) / 5) + 1));
			reserve(count);
			const points: XY[] = Array.from({ length: count }, (_, i) => {
				const angle = (startAngle + sweepAngle * i / (count - 1)) * Math.PI / 180;
				const x = major * Math.cos(angle), y = minor * Math.sin(angle);
				return [center[0] + xx * x + xy * y, center[1] + yx * x + yy * y];
			});
			geometry = { type: 'LineString', coordinates: points };
		} else if (type === 17) {
			const textOffset = dimension === 2 ? 60 : 76;
			const coordOffset = dimension === 2 ? 50 : 62;
			requireBytes(body, 0, textOffset);
			const length = raw[textOffset - 2];
			requireBytes(body, textOffset, length);
			const text = raw.subarray(textOffset, textOffset + length);
			// 文字コードはファイル内で特定できない。既存と同じUTF-8を基本とする。
			Object.assign(properties, { Text: new TextDecoder().decode(text).replace(/\0+$/, '') });
			reserve(1);
			geometry = {
				type: 'Point',
				coordinates: point(readInt32(body, coordOffset), readInt32(body, coordOffset + 4))
			};
		} else {
			requireBytes(body, 36, 4);
			const count = body.getUint16(38, true);
			const groupEnd = start + 38 + body.getUint16(36, true) * 2;
			if (groupEnd < offset || groupEnd > bytes.length) {
				throw new Error('DGNの複合図形の長さが不正です');
			}
			const lines: XY[][] = [];
			for (let i = 0; i < count; i++) {
				if (offset >= groupEnd || !(bytes[offset] & 0x80)) {
					throw new Error('DGNの複合図形の子要素が不正です');
				}
				const child = readElement(depth + 1);
				if (!child) continue;
				if (child.geometry.type === 'LineString') lines.push(child.geometry.coordinates);
				else if (child.geometry.type === 'MultiLineString') {
					lines.push(...child.geometry.coordinates);
				} else throw new Error('DGNの複合図形に未対応の子図形があります');
			}
			if (offset !== groupEnd) throw new Error('DGNの複合図形の要素数と長さが一致しません');
			if (!lines.length) return null;
			geometry = type === 14
				? assembleShape(lines, Math.max(scale * 1e-4, 1e-10))
				: { type: 'MultiLineString', coordinates: lines };
		}
		if (attrs.fillColor !== undefined && (type === 6 || type === 14)) {
			Object.assign(properties, {
				FillColorIndex: attrs.fillColor,
				color: colors[attrs.fillColor]
			});
		}
		return { type: 'Feature', id, geometry, properties };
	};
	while (offset < bytes.length && !(bytes[offset] === 255 && bytes[offset + 1] === 255)) {
		const feature = readElement();
		if (feature) emit(feature);
	}
	if (!features.length) throw new Error('DGNに表示可能な図形がありません');
	return {
		geojson: { type: 'FeatureCollection', features } as FeatureCollection,
		spatialStatus: options.project ? 'resolved' as const : 'crs-missing' as const,
		metadata,
		omittedCount,
		unsupportedTypes,
		approximatedCount
	};
};
