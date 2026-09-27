export interface AsciiGrid {
	width: number;
	height: number;
	/** 北から南へ、各行は西から東へ並ぶ。欠損セルはNaNに正規化する。 */
	band: Float64Array;
	bbox: [number, number, number, number];
	cellSize: [number, number];
	sourceNodata: number;
	range: { min: number; max: number; };
}

const HEADER_KEYS = new Set([
	'ncols',
	'nrows',
	'xllcorner',
	'yllcorner',
	'xllcenter',
	'yllcenter',
	'cellsize',
	'dx',
	'dy',
	'nodata_value'
]);
const NUMBER_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eEdD][+-]?\d+)?$/;
const parseNumber = (token: string, name: string, allowNaN = false) => {
	if (allowNaN && /^nan$/i.test(token)) return NaN;
	const value = Number(token.replace(/[dD]/, 'e'));
	if (!NUMBER_PATTERN.test(token) || !Number.isFinite(value)) {
		throw new Error(`ASCII Gridの${name}が数値ではありません: ${token.slice(0, 40)}`);
	}
	return value;
};

/** Esri ASCII Grid / GDAL AAIGrid。改行位置ではなくセル数で行を区切る。 */
export const parseAsciiGrid = (text: string): AsciiGrid => {
	const tokens = /\S+/g;
	const next = () => tokens.exec(text)?.[0];
	const header = new Map<string, number>();
	let token = next();
	while (token && HEADER_KEYS.has(token.toLowerCase())) {
		const key = token.toLowerCase();
		if (header.has(key)) throw new Error(`ASCII Gridのヘッダーが重複しています: ${key}`);
		const value = next();
		if (value === undefined) throw new Error(`ASCII Gridの${key}に値がありません`);
		header.set(key, parseNumber(value, key, key === 'nodata_value'));
		token = next();
	}
	const required = (key: string) => {
		const value = header.get(key);
		if (value === undefined) throw new Error(`ASCII Gridに${key}がありません`);
		return value;
	};
	const width = required('ncols');
	const height = required('nrows');
	const count = width * height;
	if (![width, height, count].every(value => Number.isSafeInteger(value) && value > 0)) {
		throw new Error('ASCII Gridの行数・列数は正の整数で指定してください');
	}
	// 不正な巨大ヘッダーで、入力サイズを超える配列を確保しない。
	if (count > text.length) throw new Error('ASCII Gridのセル数がヘッダーと一致しません');
	const centered = header.has('xllcenter') || header.has('yllcenter');
	if (centered && (header.has('xllcorner') || header.has('yllcorner'))) {
		throw new Error('ASCII Gridの原点指定はCORNERまたはCENTERで統一してください');
	}
	const x = required(centered ? 'xllcenter' : 'xllcorner');
	const y = required(centered ? 'yllcenter' : 'yllcorner');
	if (header.has('cellsize') && (header.has('dx') || header.has('dy'))) {
		throw new Error('ASCII GridのCELLSIZEとDX/DYは同時に指定できません');
	}
	const dx = header.has('cellsize') ? required('cellsize') : required('dx');
	const dy = header.has('cellsize') ? required('cellsize') : required('dy');
	if (!(dx > 0 && dy > 0)) throw new Error('ASCII Gridのセルサイズは正の数で指定してください');
	const west = x - (centered ? dx / 2 : 0);
	const south = y - (centered ? dy / 2 : 0);
	const bbox: AsciiGrid['bbox'] = [west, south, west + width * dx, south + height * dy];
	if (!bbox.every(Number.isFinite) || bbox[0] >= bbox[2] || bbox[1] >= bbox[3]) {
		throw new Error('ASCII Gridの座標範囲が不正です');
	}
	const sourceNodata = header.get('nodata_value') ?? -9999;
	const band = new Float64Array(count);
	let min = Infinity;
	let max = -Infinity;
	for (let index = 0; index < count; index++) {
		if (token === undefined) {
			throw new Error('ASCII Gridのセル数がヘッダーより少なくなっています');
		}
		const value = parseNumber(token, `${index + 1}番目のセル`, Number.isNaN(sourceNodata));
		const missing = Number.isNaN(value) || value === sourceNodata;
		band[index] = missing ? NaN : value;
		if (!missing) {
			min = Math.min(min, value);
			max = Math.max(max, value);
		}
		token = next();
	}
	if (token !== undefined) throw new Error('ASCII Gridのセル数がヘッダーより多くなっています');
	if (!Number.isFinite(min)) throw new Error('ASCII Gridに欠損値以外のセルがありません');
	return { width, height, band, bbox, cellSize: [dx, dy], sourceNodata, range: { min, max } };
};
