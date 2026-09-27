export type GeoTransform = [number, number, number, number, number, number];
export type RasterBounds = [number, number, number, number];
export type DataRange = { min: number; max: number; };
export interface RawRasterHeader {
	format: 'ENVI' | 'ESRI';
	width: number;
	height: number;
	bandCount: number;
	layout: 'bil' | 'bip' | 'bsq';
	bits: number;
	kind: 'unsigned' | 'signed' | 'float';
	littleEndian: boolean;
	offset: number;
	bandRowBytes: number;
	rowBytes: number;
	bandGapBytes: number;
	nodata: number | null;
	transform: GeoTransform | null;
	crs: string;
	defaultBands: number[];
}
export interface RawRaster extends RawRasterHeader {
	bands: Float64Array[];
	ranges: DataRange[];
	bbox: RasterBounds;
}
export const MAX_RAW_RASTER_BYTES = 512 * 1024 * 1024;
export const MAX_RAW_RASTER_SAMPLES = 16 * 1024 * 1024;
export const MAX_HEADER_BYTES = 1024 * 1024;

const number = (value: string | undefined, key: string): number => {
	if (!value?.trim()) throw new Error(`HDRに${key}がありません`);
	const parsed = Number(value.replace(/[dD]([+-]?\d+)$/, 'e$1'));
	if (!Number.isFinite(parsed)) throw new Error(`HDRの${key}が不正です`);
	return parsed;
};
const integer = (value: string | undefined, key: string, minimum = 1) => {
	const parsed = number(value, key);
	if (!Number.isSafeInteger(parsed) || parsed < minimum) throw new Error(`HDRの${key}が不正です`);
	return parsed;
};
const list = (value = '') => value.split(',').map(item => item.trim().replace(/^"|"$/g, ''));

/** ENVIの複数行brace値（WKTを含む）と、ESRIの行末コメントを読む。 */
const readHeader = (text: string, envi: boolean): Map<string, string> => {
	const values = new Map<string, string>();
	const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
	for (let i = envi ? 1 : 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line || /^[;#]/.test(line)) continue;
		const match = envi ? line.match(/^([^=]+)=(.*)$/) : line.match(/^(\w+)\s+(?:=\s*)?(\S+)/);
		if (!match) continue;
		const key = match[1].trim().toLowerCase().replaceAll('_', ' ');
		let value = match[2].trim();
		if (envi && value.startsWith('{')) {
			while (!value.endsWith('}') && i + 1 < lines.length) value += `\n${lines[++i].trim()}`;
			if (!value.endsWith('}')) throw new Error(`HDRの${key}の括弧が閉じていません`);
			value = value.slice(1, -1).trim();
		}
		if (values.has(key)) throw new Error(`HDRの${key}が重複しています`);
		values.set(key, value);
	}
	return values;
};

export const rasterBounds = (
	transform: GeoTransform,
	width: number,
	height: number
): RasterBounds => {
	const [x, a, b, y, c, d] = transform;
	const corners = [[0, 0], [width, 0], [width, height], [0, height]]
		.map(([column, row]) => [x + a * column + b * row, y + c * column + d * row]);
	const xs = corners.map(point => point[0]), ys = corners.map(point => point[1]);
	const bounds: RasterBounds = [
		Math.min(...xs),
		Math.min(...ys),
		Math.max(...xs),
		Math.max(...ys)
	];
	if (
		!bounds.every(Number.isFinite) || bounds[0] >= bounds[2] || bounds[1] >= bounds[3]
		|| Math.abs(a * d - b * c) === 0
	) {
		throw new Error('HDRの画像位置・セルサイズが不正です');
	}
	return bounds;
};

export const parseRawRasterHeader = (text: string): RawRasterHeader => {
	if (text.length > MAX_HEADER_BYTES) throw new Error('HDRは1 MiB以下にしてください');
	text = text.replace(/^\uFEFF/, '').trim();
	const envi = /^ENVI\s*(?:\r?\n|$)/i.test(text);
	const fields = readHeader(text, envi);
	const get = (key: string, fallback?: string) => fields.get(key) ?? fallback;
	const compression = get('file compression', get('compression', '0'))!.toLowerCase();
	if (!['0', 'none', 'uncompressed'].includes(compression)) {
		throw new Error('圧縮された画像本体には対応していません');
	}
	const width = integer(get(envi ? 'samples' : 'ncols'), '列数');
	const height = integer(get(envi ? 'lines' : 'nrows'), '行数');
	const bandCount = integer(get(envi ? 'bands' : 'nbands', envi ? undefined : '1'), 'バンド数');
	if (bandCount > 1024) throw new Error('バンド数は1,024以下にしてください');
	if (
		!Number.isSafeInteger(width * height * bandCount)
		|| width * height * bandCount > MAX_RAW_RASTER_SAMPLES
	) {
		throw new Error('画像の総サンプル数は16,777,216以下にしてください（列×行×バンド）');
	}
	const layout = get(envi ? 'interleave' : 'layout', envi ? undefined : 'bil')?.toLowerCase();
	if (layout !== 'bil' && layout !== 'bip' && layout !== 'bsq') {
		throw new Error('HDRの格納順はBIL・BIP・BSQに対応しています');
	}
	let bits: number;
	let kind: RawRasterHeader['kind'];
	if (envi) {
		const types: Record<number, [number, RawRasterHeader['kind']]> = {
			1: [8, 'unsigned'],
			2: [16, 'signed'],
			3: [32, 'signed'],
			4: [32, 'float'],
			5: [64, 'float'],
			12: [16, 'unsigned'],
			13: [32, 'unsigned']
		};
		const type = integer(get('data type'), 'data type');
		if (!types[type]) throw new Error('ENVIの複素数・64bit整数には対応していません');
		[bits, kind] = types[type];
		if (
			get('file type', 'ENVI Standard')!.toLowerCase() !== 'envi standard'
			&& get('file type')!.toLowerCase() !== 'envi classification'
		) {
			throw new Error('ENVI StandardまたはENVI Classificationの画像を選択してください');
		}
	} else {
		bits = integer(get('nbits', '8'), 'nbits');
		const pixelType = get('pixeltype', 'UNSIGNEDINT')!.toUpperCase();
		if (!['SIGNEDINT', 'UNSIGNEDINT', 'FLOAT'].includes(pixelType)) {
			throw new Error('HDRのPIXELTYPEに対応していません');
		}
		kind = pixelType === 'FLOAT' ? 'float' : pixelType === 'SIGNEDINT' ? 'signed' : 'unsigned';
		if (!(kind === 'float' ? [32, 64] : [8, 16, 32]).includes(bits)) {
			throw new Error('ESRIの整数は8/16/32bit、浮動小数は32/64bitに対応しています');
		}
	}
	const order = get(envi ? 'byte order' : 'byteorder', envi ? '0' : 'I')!.toUpperCase();
	if (!(envi ? ['0', '1'] : ['I', 'M', 'LSBFIRST', 'MSBFIRST']).includes(order)) {
		throw new Error('HDRのバイト順が不正です');
	}
	const littleEndian = ['0', 'I', 'LSBFIRST'].includes(order);
	const offset = integer(get(envi ? 'header offset' : 'skipbytes', '0'), '先頭オフセット', 0);
	const packedBandRow = width * bits / 8;
	const bandRowBytes = envi
		? packedBandRow
		: integer(get('bandrowbytes', String(packedBandRow)), 'BANDROWBYTES');
	const minRow = layout === 'bil'
		? bandRowBytes * bandCount
		: layout === 'bip'
		? packedBandRow * bandCount
		: packedBandRow;
	const rowBytes = envi ? minRow : integer(get('totalrowbytes', String(minRow)), 'TOTALROWBYTES');
	const bandGapBytes = envi ? 0 : integer(get('bandgapbytes', '0'), 'BANDGAPBYTES', 0);
	if (bandRowBytes < packedBandRow || rowBytes < minRow) {
		throw new Error('HDRの行バイト数が画素数より小さくなっています');
	}
	if (layout !== 'bsq' && bandGapBytes !== 0) {
		throw new Error('BANDGAPBYTESはBSQでのみ指定できます');
	}
	if (layout !== 'bil' && bandRowBytes !== packedBandRow) {
		throw new Error('BANDROWBYTESの余白はBILでのみ指定できます');
	}
	const rawNodata = get(envi ? 'data ignore value' : 'nodata', get('nodata value'));
	const nodata = rawNodata === undefined
		? null
		: /^nan$/i.test(rawNodata)
		? NaN
		: number(rawNodata, '欠損値');
	let transform: GeoTransform | null = null;
	let crs = get('coordinate system string', '')!;
	if (envi && fields.has('map info')) {
		const map = list(get('map info'));
		if (map.length < 7) throw new Error('ENVIのmap infoが不完全です');
		const [refX, refY, x, y, dx, dy] = map.slice(1, 7).map(value => number(value, 'map info'));
		if (dx <= 0 || dy <= 0) throw new Error('ENVIのセルサイズは正の値にしてください');
		const degrees = number(
			map.find(value => /^rotation\s*=/i.test(value))?.split('=')[1] ?? '0',
			'rotation'
		);
		const angle = degrees * Math.PI / 180;
		// ENVI/GDALの1始まりtie pointは画素の外縁。ESRIの中心指定とは区別する。
		transform = [
			x - (refX - 1) * dx,
			Math.cos(angle) * dx,
			Math.sin(angle) * dx,
			y + (refY - 1) * dy,
			Math.sin(angle) * dy,
			-Math.cos(angle) * dy
		];
		if (Math.abs(degrees) === 180) transform = [transform[0], dx, 0, transform[3], 0, dy];
		const datumIndex = /^utm$/i.test(map[0]) ? 9 : 7;
		const wgs84 = /^wgs[ _-]*84$/i.test(map[datumIndex] ?? '');
		const units = map.find(value => /^units\s*=/i.test(value))?.split('=')[1].trim()
			.toLowerCase();
		if (!crs && wgs84) {
			if (/^geographic lat\/lon$/i.test(map[0]) && (!units || units === 'degrees')) {
				crs = 'EPSG:4326';
			}
			if (/^utm$/i.test(map[0]) && (!units || units === 'meters')) {
				const zone = Number(map[7]);
				if (
					Number.isInteger(zone) && zone >= 1 && zone <= 60
					&& /^(north|south)$/i.test(map[8])
				) {
					crs = `+proj=utm +zone=${zone} ${
						/^south$/i.test(map[8]) ? '+south ' : ''
					}+datum=WGS84 +units=m +no_defs`;
				}
			}
		}
	} else if (!envi) {
		const dx = number(get('xdim', '1'), 'XDIM'), dy = number(get('ydim', '1'), 'YDIM');
		if (dx <= 0 || dy <= 0) throw new Error('HDRのセルサイズは正の値にしてください');
		if (fields.has('ulxmap') || fields.has('ulymap')) {
			if (!fields.has('ulxmap') || !fields.has('ulymap')) {
				throw new Error('ULXMAPとULYMAPを両方指定してください');
			}
			const x = number(get('ulxmap'), 'ULXMAP'), y = number(get('ulymap'), 'ULYMAP');
			transform = [x - dx / 2, dx, 0, y + dy / 2, 0, -dy];
		}
	}
	if (transform) rasterBounds(transform, width, height);
	const defaultBands = fields.has('default bands')
		? list(get('default bands')).map(value => integer(value, 'default bands') - 1)
		: [];
	if (defaultBands.some(index => index >= bandCount)) {
		throw new Error('default bandsがバンド数を超えています');
	}
	return {
		format: envi ? 'ENVI' : 'ESRI',
		width,
		height,
		bandCount,
		layout,
		bits,
		kind,
		littleEndian,
		offset,
		bandRowBytes,
		rowBytes,
		bandGapBytes,
		nodata,
		transform,
		crs,
		defaultBands
	};
};

export const parseRawRaster = (header: RawRasterHeader, buffer: ArrayBuffer): RawRaster => {
	const {
		width,
		height,
		bandCount,
		layout,
		bits,
		kind,
		littleEndian,
		offset,
		rowBytes,
		bandRowBytes,
		bandGapBytes
	} = header;
	if (buffer.byteLength > MAX_RAW_RASTER_BYTES) {
		throw new Error('画像本体は512 MiB以下にしてください');
	}
	const bytes = bits / 8;
	const bandStride = rowBytes * height + bandGapBytes;
	const address = (band: number, row: number, column: number) =>
		offset + row * rowBytes + (
			layout === 'bsq'
				? band * bandStride + column * bytes
				: layout === 'bil'
				? band * bandRowBytes + column * bytes
				: (column * bandCount + band) * bytes
		);
	const required = address(bandCount - 1, height - 1, width - 1) + bytes;
	if (!Number.isSafeInteger(required) || required > buffer.byteLength) {
		throw new Error('画像本体がHDRで指定されたサイズより短くなっています');
	}
	const view = new DataView(buffer);
	const read = (at: number) =>
		kind === 'float'
			? bits === 32 ? view.getFloat32(at, littleEndian) : view.getFloat64(at, littleEndian)
			: kind === 'signed'
			? bits === 8
				? view.getInt8(at)
				: bits === 16
				? view.getInt16(at, littleEndian)
				: view.getInt32(at, littleEndian)
			: bits === 8
			? view.getUint8(at)
			: bits === 16
			? view.getUint16(at, littleEndian)
			: view.getUint32(at, littleEndian);
	// float32へ丸められたnodataとHDRの小数表記も一致させる。
	const nodata = kind === 'float' && bits === 32 && header.nodata !== null
		? Math.fround(header.nodata)
		: header.nodata;
	const bands: Float64Array[] = [], ranges: DataRange[] = [];
	let valid = false;
	for (let b = 0; b < bandCount; b++) {
		const band = new Float64Array(width * height);
		let min = Infinity, max = -Infinity;
		for (let row = 0; row < height; row++) {
			for (let column = 0; column < width; column++) {
				const value = read(address(b, row, column));
				const missing = !Number.isFinite(value) || value === nodata;
				band[row * width + column] = missing ? NaN : value;
				if (!missing) {
					min = Math.min(min, value);
					max = Math.max(max, value);
					valid = true;
				}
			}
		}
		bands.push(band);
		ranges.push(Number.isFinite(min) ? { min, max } : { min: 0, max: 1 });
	}
	if (!valid) throw new Error('画像に欠損値以外のセルがありません');
	return {
		...header,
		bands,
		ranges,
		bbox: header.transform
			? rasterBounds(header.transform, width, height)
			: [0, 0, width, height]
	};
};
