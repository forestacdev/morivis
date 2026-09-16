import type {
	Feature,
	FeatureCollection,
	LineString,
	MultiLineString,
	Point,
	Position
} from 'geojson';

export const MAX_BDS_BYTES = 32 * 1024 * 1024;
const MAX_ELEMENTS = 500_000;
const VERSIONS: Record<number, number> = {
	[-373]: 5,
	[-120]: 3,
	[-105]: 1,
	[-301]: 2,
	[-245]: 1,
	[-354]: 0,
	[-12]: 0,
	[-149]: 8,
	[-172]: 6,
	[-261]: 3,
	[-262]: 0,
	[-303]: 1,
	[-302]: 0,
	[-275]: 1,
	[-153]: 4,
	[-177]: 1,
	[-6]: 0,
	[-4]: 0,
	[-7]: 0,
	[-5]: 0,
	[-63]: 2,
	[-324]: 0,
	[-374]: 0,
	[-327]: 1,
	[-69]: 0,
	[-377]: 1,
	[-11]: 0,
	[-15]: 0,
	[-135]: 0,
	[-206]: 5,
	[-97]: 0,
	[-227]: 1,
	[-240]: 0
};
type Properties = Record<string, string | number | null>;
type BdsFeature = Feature<Point | LineString | MultiLineString, Properties>;
export interface BdsParseResult {
	geojson: FeatureCollection<Point | LineString | MultiLineString, Properties>;
	proj4String: string;
	curveCount: number;
}
const fail = (message: string): never => {
	throw new Error(`BDS: ${message}`);
};
const ensure = (value: unknown, message = '未対応または不正なデータ構造です'): void => {
	if (!value) fail(message);
};

/** MARKから逆向きにたどる検証マーカー。座標らしいバイト列の検索では図形を拾わない。 */
class Reader {
	p = 0;
	view: DataView;
	markers = new Map<number, { kind: number; length: number; }>();
	classes = new Map<number, number>();
	versions = new Set<number>();
	strings = new Map<number, string>();
	curveCount = 0;
	vertices = 0;
	items = 0;
	constructor(buffer: ArrayBuffer) {
		ensure(
			buffer.byteLength >= 16 && buffer.byteLength <= MAX_BDS_BYTES,
			'ファイルサイズが対応範囲外です（上限32 MB）'
		);
		this.view = new DataView(buffer);
		const size = buffer.byteLength;
		ensure(this.view.getUint32(size - 8, true) === 0x4b52414d, '終端MARKがありません');
		let position = this.view.getUint32(size - 4, true);
		ensure(position < size - 8 && position > 0, '終端位置が不正です');
		while (position > 0) {
			this.p = position;
			const kind = this.u8();
			const distance = this.compact();
			ensure(kind <= 2 && distance > 0 && distance <= position, '検証マーカーが不正です');
			this.markers.set(position, { kind, length: this.p - position });
			ensure(this.markers.size <= MAX_ELEMENTS, 'レコード数が多すぎます');
			position -= distance;
		}
		this.p = 0;
	}
	reserve = (length: number) => {
		ensure(
			Number.isSafeInteger(length) && length >= 0 && this.p + length <= this.view.byteLength,
			'データが途中で切れています'
		);
		const start = this.p;
		this.p += length;
		return start;
	};
	u8 = () => this.view.getUint8(this.reserve(1));
	u16 = () => this.view.getUint16(this.reserve(2), true);
	u32 = () => this.view.getUint32(this.reserve(4), true);
	i32 = () => this.view.getInt32(this.reserve(4), true);
	double = () => {
		const value = this.view.getFloat64(this.reserve(8), true);
		ensure(Number.isFinite(value), '数値が不正です');
		return value;
	};
	doubles = (n: number) => Array.from({ length: n }, this.double);
	count = () => {
		const n = this.u32();
		ensure(n <= MAX_ELEMENTS, '要素数が多すぎます');
		return n;
	};
	compact = () => {
		let value = 0, factor = 1;
		for (let i = 0; i < 5; i++) {
			const byte = this.u8();
			value += (byte & 127) * factor;
			if (byte & 128) return value;
			factor *= 128;
		}
		return fail('可変長整数が不正です');
	};
	marker = (kind: number) => {
		const marker = this.markers.get(this.p);
		ensure(marker?.kind === kind, `レコード境界が一致しません（位置${this.p}）`);
		this.markers.delete(this.p);
		this.reserve(marker!.length);
	};
	ref = () => {
		const id = this.u16();
		if (!id) return 0;
		if (!this.classes.has(id)) {
			this.marker(1);
			const type = this.i32();
			const version = this.u16();
			ensure(VERSIONS[type] === version, `図形・設定型${type}（版${version}）には未対応です`);
			ensure(!this.versions.has(type), 'クラス定義が重複しています');
			this.classes.set(id, type);
			this.versions.add(type);
		}
		return this.classes.get(id)!;
	};
	base = (type: number) => {
		if (!this.versions.has(type)) ensure(this.ref() === type);
	};
	string = () => {
		const length = this.compact();
		ensure(length <= MAX_ELEMENTS, '文字列が長すぎます');
		const values: string[] = [];
		for (let i = 0; i < length; i++) values.push(String.fromCharCode(this.u16()));
		return values.join('');
	};
	intern = (style = false): string | null => {
		const id = this.i32();
		// 負数は組み込みスタイル参照。外部のスタイル辞書は復元しない。
		if (id < 0) {
			ensure(style || id === -1);
			return null;
		}
		if (!this.strings.has(id)) {
			this.marker(0);
			this.strings.set(id, this.string());
		}
		return this.strings.get(id)!;
	};
	common = (): Properties => {
		this.base(-172);
		const properties = Object.create(null) as Properties;
		const hasAttributes = this.u8();
		ensure(hasAttributes <= 1);
		if (hasAttributes) {
			const count = this.count();
			for (let i = 0; i < count; i++) {
				const type = this.ref();
				ensure([-7, -6, -5].includes(type), '未対応の属性型です');
				this.base(-4);
				ensure(this.i32() === -1);
				const name = this.intern();
				ensure(
					name !== null && !Object.hasOwn(properties, name),
					'属性名が不正または重複しています'
				);
				properties[name!] = type === -7
					? this.string()
					: type === -6
					? this.i32()
					: this.double();
				this.marker(2);
				this.u8();
			}
		}
		const flags = this.u8();
		ensure(flags <= 3, '未対応のスタイル設定です');
		if (flags & 1) {
			this.base(-261);
			this.reserve(19);
			for (let i = 0; i < 5; i++) this.intern(true);
		}
		if (flags & 2) {
			this.base(-262);
			this.u16();
			this.intern(true);
		}
		this.string();
		return properties;
	};
	points = (count: number, dimensions: number): Position[] => {
		this.vertices += count;
		ensure(this.vertices <= MAX_ELEMENTS, '頂点数が多すぎます');
		return Array.from({ length: count }, () => this.doubles(dimensions).slice(0, 2));
	};
	geometry = (depth = 0): Position[] => {
		ensure(depth < 32, '図形の入れ子が深すぎます');
		const type = this.ref();
		let points: Position[];
		if (type === -275 || type === -303) this.base(-302);
		if (type === -275) {
			const count = this.count();
			const bounds = this.doubles(4);
			points = this.points(count, 2);
			ensure(bounds[0] <= bounds[2] && bounds[1] <= bounds[3], '図形の範囲が不正です');
			ensure(
				points.every(p =>
					p[0] >= bounds[0] - 1e-6 && p[0] <= bounds[2] + 1e-6 && p[1] >= bounds[1] - 1e-6
					&& p[1] <= bounds[3] + 1e-6
				),
				'頂点が図形の範囲外です'
			);
		} else if (type === -303) {
			points = this.geometry(depth + 1);
		} else if (type === -69) {
			this.base(-377);
			this.doubles(6);
			const count = this.count();
			points = [];
			for (let i = 0; i < count; i++) {
				const part = this.geometry(depth + 1);
				ensure(part.length >= 2);
				if (points.length) {
					const last = points[points.length - 1];
					ensure(
						Math.hypot(last[0] - part[0][0], last[1] - part[0][1]) < 1e-4,
						'連続する図形の端点が一致しません'
					);
					for (const point of part.slice(1)) points.push(point);
				} else for (const point of part) points.push(point);
			}
		} else if (type === -11) {
			const controls = this.points(4, 3);
			points = [controls[0], controls[3]];
			this.curveCount++;
		} else if (type === -15 || type === -135) {
			this.base(-135);
			points = this.points(2, 3);
			if (type === -15) {
				this.doubles(4);
				this.curveCount++;
			}
		} else if (type === -63) {
			points = this.points(this.count(), 3);
		} else if (type === -97 || type === -227) {
			this.base(-227);
			points = this.points(1, 3);
		} else return fail(`図形型${type}の読み込みには未対応です`);
		this.marker(2);
		this.u8();
		return points;
	};
	item = (type: number, depth = 0): BdsFeature[] => {
		ensure(
			depth < 32 && ++this.items <= MAX_ELEMENTS,
			'図形数または入れ子が上限を超えています'
		);
		ensure([-149, -153, -177, -206, -324].includes(type), `アイテム型${type}には未対応です`);
		const properties = this.common();
		let features: BdsFeature[];
		if (type === -149 || type === -177) {
			const count = type === -149 ? this.count() : 1;
			ensure(count > 0, '空の図形です');
			const parts = Array.from({ length: count }, () => this.geometry());
			ensure(parts.every(part => part.length >= 2), '線の頂点が不足しています');
			if (type === -149) this.doubles(3); // ラベル等の基準点。座標列への平行移動ではない。
			features = [{
				type: 'Feature',
				properties,
				geometry: parts.length === 1
					? { type: 'LineString', coordinates: parts[0] }
					: { type: 'MultiLineString', coordinates: parts }
			}];
		} else if (type === -324) {
			this.base(-374);
			const count = this.count();
			features = [];
			for (let i = 0; i < count; i++) {
				for (const feature of this.item(this.ref(), depth + 1)) features.push(feature);
			}
			features = features.map(feature => ({
				...feature,
				properties: { ...properties, ...feature.properties }
			}));
			this.base(-327);
			ensure(this.u8() === 0, 'グループの配置変換には未対応です');
		} else {
			let point: Position;
			let label: string;
			if (type === -206) {
				const points = this.geometry();
				ensure(points.length === 1);
				point = points[0];
				ensure(this.u8() === 0, '文字の配置設定には未対応です');
				label = this.string();
			} else {
				const mode = this.u8();
				ensure(mode <= 1, '文字の配置設定には未対応です');
				if (mode === 1) {
					this.doubles(4);
					point = this.points(1, 2)[0];
					this.double();
				} else point = this.points(1, 3)[0];
				label = this.string();
				this.double();
			}
			let key = 'BDS文字';
			while (Object.hasOwn(properties, key)) key += '_';
			properties[key] = label;
			features = [{
				type: 'Feature',
				properties,
				geometry: { type: 'Point', coordinates: point }
			}];
		}
		this.marker(2);
		this.u8();
		return features;
	};
}

/** 確認済みのSIS BDS版41を2Dの境界線と文字位置へ変換する。 */
export const parseBds = (buffer: ArrayBuffer): BdsParseResult => {
	const r = new Reader(buffer);
	ensure(r.u32() === 0 && r.u16() === 41, '未対応のBDSバージョンです');
	ensure(r.ref() === -373);
	r.string();
	ensure(r.ref() === -120);
	r.base(-105);
	r.base(-301);
	const [lon, lat, x0, y0] = r.doubles(4);
	r.base(-245);
	const [a, b, ...shifts] = r.doubles(10);
	const datum = r.u16();
	ensure(
		datum === 6612 && Math.abs(a - 6378137) < 1e-6 && Math.abs(b - 6356752.314140356) < 1e-6
			&& shifts.every(v => v === 0),
		'未対応の測地系です'
	);
	r.marker(2);
	r.u8();
	ensure(r.ref() === -354);
	const [unit, rotation, tx, ty, scale] = r.doubles(5);
	ensure(
		unit === 1 && rotation === 0 && tx === 0 && ty === 0 && scale > 0,
		'独自の座標変換には未対応です'
	);
	ensure(Math.abs(lon) <= Math.PI && Math.abs(lat) < Math.PI / 2, '投影法の原点が不正です');
	r.marker(2);
	r.u8();
	r.double();
	const definitions = r.count();
	ensure(definitions === 1 || definitions === 2, '部品定義に未対応です');
	if (definitions === 2) {
		ensure(r.ref() === -12);
		ensure(r.u32() === 0 && r.u32() === 1 && r.u8() === 0, '部品定義に未対応です');
		const count = r.count();
		// 部品定義は配置された地物ではない。構造を検証し、地図には追加しない。
		for (let i = 0; i < count; i++) r.item(r.ref());
		r.string();
		r.marker(2);
		r.u8();
	}
	const count = r.count();
	const features: BdsFeature[] = [];
	for (let i = 0; i < count; i++) {
		const type = r.ref();
		if (!type) continue;
		const items = r.item(type);
		items.forEach((feature, j) => {
			feature.id = `${i}:${j}`;
			features.push(feature);
		});
	}
	ensure(r.u32() === 0x00400000, '未対応のデータセット設定です');
	r.string();
	ensure(r.u32() === 0);
	ensure(r.ref() === -240);
	ensure(r.u32() === 0x4b52414d);
	r.u32();
	ensure(r.p === buffer.byteLength && r.markers.size === 0, '未処理のデータが残っています');
	return {
		geojson: { type: 'FeatureCollection', features },
		curveCount: r.curveCount,
		proj4String: `+proj=tmerc +lat_0=${lat * 180 / Math.PI} +lon_0=${
			lon * 180 / Math.PI
		} +k=${scale} +x_0=${x0} +y_0=${y0} +ellps=GRS80 +units=m +no_defs`
	};
};
