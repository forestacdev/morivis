// JWW 7.02 の公開仕様および JwwExchange (Unlicense) を参照。出典は README.md。
export interface JwwHeader {
	version: number;
	scales: number[];
	groupStates: number[];
	layerStates: number[][];
	layerNames: string[][];
	groupNames: string[];
	colors: Map<number, number>;
}

export interface JwwEntity {
	kind: string;
	curve: number;
	penStyle: number;
	penColor: number;
	penWidth: number;
	layer: number;
	group: number;
	flags: number;
	values: number[];
	text?: string;
	font?: string;
	color?: number;
	children?: JwwEntity[];
	blockId?: number;
	blockName?: string;
}

/** Bounds-checked little-endian MFC CArchive reader. No browser APIs required. */
export const createJwwReader = (buffer: ArrayBuffer) => {
	const view = new DataView(buffer);
	const sjis = new TextDecoder('shift-jis');
	const unicode = new TextDecoder('utf-16le');
	let offset = 0;
	const take = (size: number) => {
		if (!Number.isSafeInteger(size) || size < 0 || size > view.byteLength - offset) {
			throw new Error(`JWWデータが途中で切れているか、長さが不正です（${offset} byte）`);
		}
		const start = offset;
		offset += size;
		return start;
	};
	const u8 = () => view.getUint8(take(1));
	const u16 = () => view.getUint16(take(2), true);
	const u32 = () => view.getUint32(take(4), true);
	const u64 = () => {
		const value = Number(view.getBigUint64(take(8), true));
		if (!Number.isSafeInteger(value)) throw new Error('JWWの長さが読み込み上限を超えています');
		return value;
	};
	const f64 = () => {
		const value = view.getFloat64(take(8), true);
		if (!Number.isFinite(value)) throw new Error(`JWWの数値が不正です（${offset - 8} byte）`);
		return value;
	};
	const bytes = (size: number) => new Uint8Array(buffer, take(size), size);
	const string = () => {
		let length = u8();
		let wide = false;
		if (length === 0xff) {
			length = u16();
			if (length === 0xfffe) {
				wide = true;
				length = u8();
				if (length === 0xff) length = u16();
			}
			if (length === 0xffff) {
				length = u32();
				if (length === 0xffffffff) length = u64();
			}
		}
		if (length > 16_000_000) throw new Error('JWWの文字列が読み込み上限を超えています');
		return (wide ? unicode : sjis).decode(bytes(length * (wide ? 2 : 1)));
	};
	const count = () => {
		let value = u16();
		if (value === 0xffff) {
			value = u32();
			if (value === 0xffffffff) value = u64();
		}
		if (value > 1_000_000 || value > (view.byteLength - offset) / 2) {
			throw new Error('JWWの図形数が不正か、読み込み上限を超えています');
		}
		return value;
	};
	return {
		u8,
		u16,
		u32,
		f64,
		string,
		bytes,
		count,
		skip: take,
		remaining: () => view.byteLength - offset
	};
};

type Reader = ReturnType<typeof createJwwReader>;

const readHeader = (r: Reader): JwwHeader => {
	if (new TextDecoder().decode(r.bytes(8)) !== 'JwwData.') {
		throw new Error('JWW形式のファイルではありません。Jw_cadで .jww 形式に保存してください');
	}
	const version = r.u32();
	if (version < 200 || version > 700) {
		throw new Error(`未対応のJWWデータバージョンです: ${version}`);
	}
	r.string(); // memo
	r.skip(8); // paper size, current group
	const header: JwwHeader = {
		version,
		scales: [],
		groupStates: [],
		layerStates: [],
		layerNames: [],
		groupNames: [],
		colors: new Map()
	};
	for (let group = 0; group < 16; group++) {
		header.groupStates.push(r.u32());
		r.skip(4);
		header.scales.push(r.f64());
		r.skip(4);
		header.layerStates.push(Array.from({ length: 16 }, () => {
			const state = r.u32();
			r.skip(4);
			return state;
		}));
	}
	r.skip(14 * 4 + 5 * 4 + 2 * 4); // dummy, dimensions, linewidth
	r.skip(3 * 8 + 2 * 4 + 5 * 8); // printer and ruler settings
	header.layerNames = Array.from({ length: 16 }, () => Array.from({ length: 16 }, r.string));
	header.groupNames = Array.from({ length: 16 }, r.string);
	r.skip(3 * 8 + 4); // shadow
	if (version >= 300) r.skip(2 * 8);
	r.skip(4 + 6 * 8); // 2.5D units and saved view
	r.skip(version >= 300 ? 8 * (3 * 8 + 4) : 4 * 3 * 8);
	if (version >= 300) r.skip(6 * 8 + 2 * 4);
	r.skip(11 * 8); // parallel lines
	for (let i = 0; i < 10; i++) {
		header.colors.set(i, r.u32());
		r.skip(4);
	}
	r.skip(10 * 16 + 8 * 16 + 5 * 20 + 4 * 16 + 11 * 4);
	if (version >= 223) r.skip(5 * 4 + 5 * 8);
	if (version >= 225) r.skip(4 * 8);
	if (version >= 230) r.skip(8);
	if (version >= 420) {
		for (let i = 0; i <= 256; i++) {
			header.colors.set(i + 100, r.u32());
			r.skip(4);
		}
		for (let i = 0; i <= 256; i++) {
			r.string();
			r.skip(16);
		}
		r.skip(33 * 16);
		for (let i = 0; i <= 32; i++) {
			r.string();
			r.skip(4 + 10 * 8);
		}
	}
	r.skip(10 * 28 + 3 * 8 + 2 * 4 + 2 * 8 + 4 + 6 * 8);
	return header;
};

export const readJww = (buffer: ArrayBuffer) => {
	const r = createJwwReader(buffer);
	const header = readHeader(r);
	// MFC stores classes and objects in ONE shared, 1-based reference table.
	const references: (string | JwwEntity | null)[] = [null];
	let entityCount = 0;
	const base = (kind: string): JwwEntity => {
		if (++entityCount > 1_000_000) throw new Error('JWWの図形数が読み込み上限を超えています');
		const entity: JwwEntity = {
			kind,
			curve: r.u32(),
			penStyle: r.u8(),
			penColor: r.u16(),
			penWidth: header.version >= 351 ? r.u16() : 0,
			layer: r.u16(),
			group: r.u16(),
			flags: r.u16(),
			values: []
		};
		if (entity.layer > 15 || entity.group > 15) throw new Error('JWWのレイヤ番号が不正です');
		return entity;
	};
	const readBody = (kind: string, depth: number): JwwEntity => {
		if (depth > 64) throw new Error('JWWブロックの階層が深すぎます');
		const e = base(kind);
		const values = (n: number) => {
			e.values = Array.from({ length: n }, r.f64);
		};
		switch (kind) {
			case 'CDataSen':
				values(4);
				break;
			case 'CDataEnko':
				values(7);
				e.values.push(r.u32());
				break;
			case 'CDataTen':
				values(2);
				e.values.push(r.u32());
				if (e.penStyle === 100) e.values.push(r.u32(), r.f64(), r.f64());
				break;
			case 'CDataMoji':
				values(4);
				e.values.push(r.u32(), r.f64(), r.f64(), r.f64(), r.f64());
				e.font = r.string();
				e.text = r.string();
				break;
			case 'CDataSolid':
				values(8);
				if (e.penColor === 10) e.color = r.u32();
				break;
			case 'CDataSunpou': {
				e.children = [readBody('CDataSen', depth), readBody('CDataMoji', depth)];
				if (header.version >= 420) {
					const sxfMode = r.u16();
					const children = [
						'CDataSen',
						'CDataSen',
						'CDataTen',
						'CDataTen',
						'CDataTen',
						'CDataTen'
					]
						.map(name => readBody(name, depth));
					// Extra members are serialized even when inactive; reference points are not drawn.
					if (sxfMode) e.children.push(...children.slice(0, 4));
				}
				break;
			}
			case 'CDataBlock':
				values(5);
				e.blockId = r.u32();
				break;
			case 'CDataList':
				e.blockId = r.u32();
				r.skip(4);
				if (r.u32() === 0x8000000a) r.skip(8); // MFC CTime64 marker; otherwise legacy time32
				e.blockName = r.string();
				e.children = readList(depth + 1);
				break;
			default:
				throw new Error(`未対応のJWW図形です: ${kind}`);
		}
		return e;
	};
	const readObject = (depth: number): JwwEntity | null => {
		const word = r.u16();
		let kind: string;
		if (word === 0xffff) {
			r.u16(); // class schema; JWW body uses the FILE version, not this schema
			const length = r.u16();
			if (length > 128) throw new Error('JWWのクラス名が不正です');
			kind = new TextDecoder().decode(r.bytes(length));
			references.push(kind);
		} else {
			const tag = word === 0x7fff
				? r.u32()
				: ((word & 0x8000) ? (word & 0x7fff) + 0x80000000 : word);
			const reference = references[tag & 0x7fffffff];
			if (tag < 0x80000000) {
				if (tag === 0) return null;
				if (!reference || typeof reference === 'string') {
					throw new Error('JWWの図形参照が不正です');
				}
				return reference;
			}
			if (typeof reference !== 'string') throw new Error('JWWのクラス参照が不正です');
			kind = reference;
		}
		const id = references.length;
		references.push(null);
		const entity = readBody(kind, depth);
		references[id] = entity;
		return entity;
	};
	const readList = (depth: number) => {
		const count = r.count();
		const entities: JwwEntity[] = [];
		for (let i = 0; i < count; i++) {
			const entity = readObject(depth);
			if (entity) entities.push(entity);
		}
		return entities;
	};
	const entities = readList(0);
	const definitions = readList(0);
	let imageCount = 0;
	if (header.version >= 700) {
		imageCount = r.u32();
		if (imageCount > 100_000) throw new Error('JWWの画像数が不正です');
		for (let i = 0; i < imageCount; i++) {
			r.string();
			r.skip(r.u32());
		}
	}
	if (r.remaining() !== 0) throw new Error('JWWの末尾に未対応のデータがあります');
	return { header, entities, definitions, imageCount };
};
