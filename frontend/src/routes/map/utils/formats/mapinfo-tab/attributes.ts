import { requireTab, TabReader } from './binary';
import { formatMapinfoTab } from './definition';

export interface TabField {
	name: string;
	type: string;
}
export interface TabHeader {
	fields: TabField[];
	native: boolean;
	decoder: TextDecoder;
}
const encodings: Record<string, string> = {
	neutral: 'windows-1252',
	windowslatin1: 'windows-1252',
	windowslatin2: 'windows-1250',
	windowscyrillic: 'windows-1251',
	windowsgreek: 'windows-1253',
	windowsturkish: 'windows-1254',
	windowshebrew: 'windows-1255',
	windowsarabic: 'windows-1256',
	windowsbaltic: 'windows-1257',
	windowsvietnamese: 'windows-1258',
	windowsjapanese: 'shift-jis',
	windowssimpchinese: 'gbk',
	windowschinesesimp: 'gbk',
	windowschinesetrad: 'big5',
	windowstradchinese: 'big5',
	windowskorean: 'euc-kr',
	utf8: 'utf-8',
	'utf-8': 'utf-8'
};
export const readTabHeader = (bytes: Uint8Array): TabHeader => {
	requireTab(
		bytes.length <= formatMapinfoTab.limits.maxHeaderBytes,
		'TABヘッダーは1 MiB以下にしてください'
	);
	const ascii = new TextDecoder('windows-1252').decode(bytes);
	const charset = ascii.match(/!charset\s+["']?([^\s"']+)/i)?.[1] ?? 'Neutral';
	let decoder: TextDecoder;
	try {
		decoder = new TextDecoder(encodings[charset.toLowerCase()] ?? charset);
	} catch {
		throw new Error(`MapInfo TAB: 未対応の文字コードです (${charset})`);
	}
	const text = decoder.decode(bytes);
	requireTab(/^\s*!table\b/i.test(text), 'TABヘッダーではありません');
	const type = text.match(/^\s*Type\s+(\w+)/im)?.[1].toUpperCase();
	requireTab(
		type === 'NATIVE' || type === 'DBF',
		'Native／DBF形式のベクターTABのみ対応しています'
	);
	const match = /^\s*Fields\s+(\d+)\s*$/im.exec(text);
	requireTab(match, '属性定義がありません');
	const count = Number(match![1]);
	requireTab(count > 0 && count <= 2048, '属性列数が不正です');
	const fields: TabField[] = [];
	const definitions = text.slice(match!.index + match![0].length);
	for (
		const field of definitions.matchAll(
			/^\s*(?:"([^"]+)"|([^\s;]+))\s+(Char|Integer|SmallInt|LargeInt|Float|Decimal|DateTime|Date|Time|Logical)\b[^;\r\n]*;/gim
		)
	) {
		fields.push({ name: field[1] ?? field[2], type: field[3].toLowerCase() });
	}
	requireTab(
		fields.length === count && new Set(fields.map(f => f.name)).size === count,
		'未対応または重複した属性定義があります'
	);
	return { fields, native: type === 'NATIVE', decoder };
};

const pad = (v: number, digits = 2) => String(v).padStart(digits, '0');
const date = (r: TabReader) => {
	const year = r.i16(), month = r.u8(), day = r.u8();
	if (!year && !month && !day) return null;
	requireTab(
		year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= 31,
		'日付属性が不正です'
	);
	return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
};
const time = (r: TabReader) => {
	const ms = r.i32();
	if (ms === -1) return null;
	requireTab(ms >= 0 && ms < 86400000, '時刻属性が不正です');
	return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${
		pad(Math.floor(ms / 1000) % 60)
	}.${pad(ms % 1000, 3)}`;
};

export const readAttributes = (bytes: Uint8Array, header: TabHeader) => {
	const r = new TabReader(bytes);
	r.range(0, 32);
	r.seek(4);
	const count = r.u32(), headerSize = r.u16(), rowSize = r.u16();
	requireTab(
		count <= formatMapinfoTab.limits.maxFeatures,
		'MapInfo TABは50万地物以下にしてください'
	);
	requireTab(
		headerSize >= 33 && (headerSize - 33) % 32 === 0 && rowSize > 0,
		'属性ヘッダーが不正です'
	);
	r.range(headerSize, count * rowSize);
	requireTab(
		(headerSize - 33) / 32 === header.fields.length && bytes[headerSize - 1] === 13,
		'TABと属性ファイルの列数が一致しません'
	);
	const sizes = header.fields.map((_, i) => bytes[32 + i * 32 + 16]);
	requireTab(sizes.every(size => size > 0), '属性フィールド長が不正です');
	requireTab(1 + sizes.reduce((a, b) => a + b, 0) === rowSize, '属性レコード長が不正です');
	const widths: Record<string, number> = {
		integer: 4,
		smallint: 2,
		largeint: 8,
		float: 8,
		date: 4,
		time: 4,
		datetime: 8,
		logical: 1
	};
	const rows: (Record<string, unknown> | null)[] = [];
	for (let i = 0; i < count; i++) {
		r.seek(headerSize + i * rowSize);
		const flag = r.u8();
		requireTab(flag === 32 || flag === 42, '属性の削除フラグが不正です');
		if (flag === 42) {
			rows.push(null);
			continue;
		}
		const properties: Record<string, unknown> = Object.create(null);
		header.fields.forEach((field, j) => {
			const size = sizes[j], raw = r.take(size), value = new TabReader(raw);
			const text = () => header.decoder.decode(raw).replace(/\0.*$/s, '').trimEnd();
			let result: unknown;
			if (header.native && field.type in widths) {
				requireTab(size === widths[field.type], '属性フィールド長が不正です');
				switch (field.type) {
					case 'integer':
						result = value.i32();
						break;
					case 'smallint':
						result = value.i16();
						break;
					case 'largeint':
						result = value.i64();
						break;
					case 'float':
						result = value.f64();
						break;
					case 'logical':
						result = value.u8() ? 'T' : 'F';
						break;
					case 'date':
						result = date(value);
						break;
					case 'time':
						result = time(value);
						break;
					case 'datetime': {
						const d = date(value), t = time(value);
						result = d && t ? `${d}T${t}` : null;
						break;
					}
				}
			} else if (field.type === 'char') result = text();
			else if (field.type === 'logical') result = /^[1YyTt]/.test(text()) ? 'T' : 'F';
			else if (['date', 'time', 'datetime'].includes(field.type)) {
				const t = text().trim();
				if (!t || /^0+$/.test(t)) result = null;
				else {
					const digits = field.type === 'date' ? 8 : field.type === 'time' ? 9 : 17;
					requireTab(new RegExp(`^\\d{${digits}}$`).test(t), '日付・時刻属性が不正です');
					const d = field.type === 'time'
						? ''
						: `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
					const clock = field.type === 'datetime' ? t.slice(8) : t;
					const timeText = `${clock.slice(0, 2)}:${clock.slice(2, 4)}:${
						clock.slice(4, 6)
					}.${clock.slice(6, 9)}`;
					result = field.type === 'date'
						? d
						: field.type === 'time'
						? timeText
						: `${d}T${timeText}`;
				}
			} else {
				const t = text().trim();
				result = t ? Number(t) : null;
				requireTab(result === null || Number.isFinite(result), '数値属性が不正です');
				if (field.type === 'largeint' && t && !Number.isSafeInteger(result)) {
					requireTab(/^[+-]?\d+$/.test(t), '整数属性が不正です');
					result = BigInt(t).toString();
				}
			}
			properties[field.name] = result;
		});
		rows.push(properties);
	}
	return rows;
};
