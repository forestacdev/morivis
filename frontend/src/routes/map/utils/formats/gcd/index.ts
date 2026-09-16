import type { Feature, FeatureCollection, LineString, MultiLineString, Position } from 'geojson';

export const MAX_GCD_BYTES = 128 * 1024 * 1024;
const MAX_FEATURES = 200_000;
const MAX_VERTICES = 2_000_000;
const fail = (message: string): never => {
	throw new Error(`GCD: ${message}`);
};

class Reader {
	position: number;
	constructor(readonly view: DataView, start = 0, readonly end = view.byteLength) {
		this.position = start;
	}
	remaining = () => this.end - this.position;
	skip = (length: number) => {
		if (!Number.isSafeInteger(length) || length < 0 || length > this.remaining()) {
			fail('データが途中で切れています');
		}
		this.position += length;
	};
	byte = () => {
		this.skip(1);
		return this.view.getUint8(this.position - 1);
	};
	uint = () => {
		let value = 0;
		let factor = 1;
		for (let i = 0; i < 8; i++) {
			const byte = this.byte();
			value += (byte & 127) * factor;
			if (!Number.isSafeInteger(value)) fail('整数が対応範囲を超えています');
			if (byte < 128) return value;
			factor *= 128;
		}
		return fail('整数の符号化が不正です');
	};
	signed = () => {
		const value = this.uint();
		return value % 2 ? -(value + 1) / 2 : value / 2;
	};
	count = (max: number) => {
		const value = this.uint();
		if (value > max) fail('要素数が対応範囲を超えています');
		return value;
	};
	float = (bytes: 4 | 8) => {
		this.skip(bytes);
		const value = bytes === 8
			? this.view.getFloat64(this.position - bytes, true)
			: this.view.getFloat32(this.position - bytes, true);
		if (!Number.isFinite(value)) fail('座標または数値が不正です');
		return value;
	};
	string = () => {
		const length = this.count(Math.min(1_000_000, this.remaining()));
		const chars: string[] = [];
		for (let i = 0; i < length; i++) {
			const code = this.uint();
			if (code > 0xffff) fail('文字の符号化に対応していません');
			chars.push(String.fromCharCode(code));
		}
		return chars.join('');
	};
	record = () => {
		const length = this.uint();
		if (!length) fail('空のレコードです');
		const start = this.position;
		this.skip(length);
		return new Reader(this.view, start, this.position);
	};
	finish = () => {
		if (this.remaining()) fail('未対応の追加データがあります');
	};
}

export interface GcdParseResult {
	crs: string;
	geojson: FeatureCollection<LineString | MultiLineString>;
	vertexCount: number;
}

/** 実測できた38 14形式の2D座標列を境界線として読む。塗り・曲線・記号は復元しない。 */
export const parseGcd = (buffer: ArrayBuffer): GcdParseResult => {
	if (buffer.byteLength > MAX_GCD_BYTES) fail('ファイルは128 MB以下にしてください');
	const reader = new Reader(new DataView(buffer));
	if (reader.byte() !== 0x38 || reader.byte() !== 0x14) {
		fail('未対応のファイル形式・バージョンです');
	}
	const sections = new Map<number, Reader>();
	while (reader.remaining()) {
		const section = reader.record();
		const type = section.uint();
		if (![1, 2, 3, 5, 6, 7].includes(type) || sections.has(type)) {
			fail('未対応または重複したセクションです');
		}
		sections.set(type, section);
	}
	const section = (id: number) => sections.get(id) ?? fail('必要なセクションがありません');
	const header = section(1);
	const crs = header.string();
	if (!/^EPSG:[1-9]\d*$/.test(crs)) fail('座標系を特定できません');
	const bounds = Array.from({ length: 6 }, () => header.float(8));
	const transform = Array.from({ length: 6 }, () => header.float(8));
	header.finish();
	if (
		bounds[2] !== 0 || bounds[5] !== 0
		|| transform.slice(0, 4).some((v, i) => v !== [0, 0, 1, 1][i])
	) {
		fail('3D座標または独自の座標変換には対応していません');
	}
	const [scaleX, scaleY] = transform.slice(4);
	if (scaleX <= 0 || scaleY <= 0 || bounds[0] > bounds[3] || bounds[1] > bounds[4]) {
		fail('座標範囲が不正です');
	}

	const schema = section(3);
	const fields: { name: string; type: number; }[] = [];
	const names = new Set<string>();
	const fieldCount = schema.count(1024);
	for (let i = 0; i < fieldCount; i++) {
		const field = schema.record();
		const type = field.uint();
		if (type !== 3 && type !== 9) fail(`属性型${type}には対応していません`);
		const name = field.string();
		if (!name || names.has(name) || ['__proto__', 'constructor', 'prototype'].includes(name)) {
			fail('属性名が不正または重複しています');
		}
		names.add(name);
		if (field.uint() !== 0) fail('未対応の属性設定です');
		field.finish();
		fields.push({ name, type });
	}
	schema.finish();
	// スタイルの内容は使わないが、存在しないスタイルへの参照は拒否する。
	const styles = section(6);
	const styleCount = styles.count(65_536);
	for (let i = 0; i < styleCount; i++) styles.record();
	styles.finish();
	const objects = section(7);
	const count = objects.count(MAX_FEATURES);
	const features: Feature<LineString | MultiLineString>[] = [];
	const ids = new Set<number>();
	let vertexCount = 0;
	const actualBounds = [Infinity, Infinity, -Infinity, -Infinity];
	for (let i = 0; i < count; i++) {
		const object = objects.record();
		const id = object.uint();
		if (ids.has(id)) fail('図形IDが重複しています');
		ids.add(id);
		const flags = object.uint();
		if (flags !== 0 && flags !== 2) fail('未対応の図形設定です');
		if (flags === 2) object.float(4);
		if (object.uint() >= styleCount) fail('スタイル参照が不正です');
		const attributes = object.record();
		const attributeCount = attributes.count(fields.length);
		const mask = Array.from({ length: Math.ceil(attributeCount / 8) }, () => attributes.byte());
		const properties: Record<string, string | null> = {};
		for (let j = 0; j < attributeCount; j++) {
			properties[fields[j].name] = mask[Math.floor(j / 8)] & (128 >> (j % 8))
				? attributes.string()
				: null;
		}
		attributes.finish();
		const geometry = object.record();
		const type = geometry.uint();
		if (type !== 4 && type !== 12) fail(`図形型${type}には対応していません`);
		const points = geometry.count(MAX_VERTICES - vertexCount);
		if (points < 2 || geometry.uint() !== 0x45) fail('未対応の座標列です');
		vertexCount += points;
		const coordinates: Position[] = [];
		let x = 0, y = 0;
		for (let j = 0; j < points; j++) {
			x += geometry.signed();
			y += geometry.signed();
			if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
				fail('座標が対応範囲を超えています');
			}
			const point = [x / scaleX, y / scaleY];
			if (!point.every(Number.isFinite)) fail('座標が不正です');
			coordinates.push(point);
			actualBounds[0] = Math.min(actualBounds[0], point[0]);
			actualBounds[1] = Math.min(actualBounds[1], point[1]);
			actualBounds[2] = Math.max(actualBounds[2], point[0]);
			actualBounds[3] = Math.max(actualBounds[3], point[1]);
		}
		geometry.skip(points); // 頂点ごとの描画補助値。境界線の座標には適用しない。
		const partCount = type === 12 ? geometry.count(points) : 1;
		if (!partCount) fail('図形の区切りがありません');
		const parts: Position[][] = [];
		let end = 0;
		for (let j = 0; j < partCount; j++) {
			const start = geometry.uint();
			const length = geometry.uint();
			if (start !== end || length < 2 || length > points - start) {
				fail('図形の区切りが不正です');
			}
			end = start + length;
			parts.push(coordinates.slice(start, end));
		}
		if (end !== points) fail('読み取れない頂点が残っています');
		geometry.finish();
		object.finish();
		features.push({
			type: 'Feature',
			id,
			properties,
			geometry: parts.length === 1
				? { type: 'LineString', coordinates: parts[0] }
				: { type: 'MultiLineString', coordinates: parts }
		});
	}
	objects.finish();
	if (!features.length) fail('読み込める図形がありません');
	const expectedBounds = [bounds[0], bounds[1], bounds[3], bounds[4]];
	if (
		actualBounds.some((value, i) =>
			Math.abs(value - expectedBounds[i]) > Math.max(1 / scaleX, 1 / scaleY) + 1e-7
		)
	) {
		fail('復元した座標とファイルの範囲が一致しません');
	}
	return { crs, geojson: { type: 'FeatureCollection', features }, vertexCount };
};
