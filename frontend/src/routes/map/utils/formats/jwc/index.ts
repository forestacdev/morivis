// JWC fixed2389/fixed2421 layouts adapted from ezjww (MIT); see LICENSE.ezjww and README.md.
import { convertJwCadDocument, type JwwParseResult } from '../jww';
import type { JwwEntity, JwwHeader } from '../jww/reader';

const SIGNATURE = 'jw_cad(c)data.......a.f.m...............';
const PAPER = [[1189, 841], [841, 594], [594, 420], [420, 297], [297, 210]];
// Rendering defaults, NOT an RGB palette recovered from the source file.
const PALETTE = [
	0,
	0xcc6600,
	0x000080,
	0x00cc00,
	0x00cccc,
	0xcc00cc,
	0xff0000,
	0x008000,
	0x0000ff,
	0x808080
];

export const parseJwc = (buffer: ArrayBuffer): JwwParseResult => {
	const bytes = new Uint8Array(buffer);
	const view = new DataView(buffer);
	const invalid = (reason: string): never => {
		throw new Error(`JWCを読み込めません: ${reason}`);
	};
	const range = (offset: number, length: number) => {
		if (
			!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0
			|| length < 0 || offset + length > bytes.length
		) invalid('データの長さが不正です');
	};
	const u8 = (offset: number) => {
		range(offset, 1);
		return view.getUint8(offset);
	};
	const u16 = (offset: number) => {
		range(offset, 2);
		return view.getUint16(offset, true);
	};
	const u32 = (offset: number) => {
		range(offset, 4);
		return view.getUint32(offset, true);
	};
	const f32 = (offset: number) => {
		range(offset, 4);
		const value = view.getFloat32(offset, true);
		if (!Number.isFinite(value)) invalid('座標・寸法の数値が不正です');
		return value;
	};
	if (bytes.length > 64 * 1024 * 1024) invalid('64 MiBを超えています');
	range(0, 40);
	const floatScales = bytes[22] === 102;
	if (!floatScales && bytes[22] !== 46) invalid('未対応のJWCヘッダーです');
	for (let i = 0; i < 40; i++) {
		if (i !== 22 && bytes[i] !== SIGNATURE.charCodeAt(i)) {
			invalid('未対応のJWCシグネチャです');
		}
	}
	const headerSize = floatScales ? 2421 : 2389;
	range(0, headerSize);
	for (const offset of [199, 399, 599, 799]) {
		if (u8(offset) !== 10) invalid('ヘッダーの区切りが不正です');
	}
	const csv = (offset: number) => {
		const data = bytes.subarray(offset, offset + 199);
		const end = data.indexOf(0);
		if (end < 0 || data.subarray(end).some(b => b !== 0 && b !== 32)) {
			invalid('設定レコードが不正です');
		}
		const text = new TextDecoder().decode(data.subarray(0, end));
		if (!/^[\x20-\x7e]*$/.test(text)) invalid('設定レコードの文字が不正です');
		return text.split(',').map(v => v.trim());
	};
	const settings = csv(200);
	csv(400);
	const storage = csv(600);
	const integer = (text: string | undefined) => {
		if (!text || !/^\d+$/.test(text)) invalid('図形数・用紙指定が不正です');
		const value = Number(text);
		if (!Number.isSafeInteger(value)) invalid('図形数が上限を超えています');
		return value;
	};
	const counts = Array.from({ length: 5 }, (_, i) => integer(settings[i]));
	if (counts.reduce((a, b) => a + b, 0) > 100_000 || counts[4] > 100) {
		invalid('図形数が上限を超えています');
	}
	const paper = PAPER[integer(settings[11])];
	if (!paper || (settings[30] !== undefined && Number(settings[30]) !== 518)) {
		invalid('未対応の用紙・座標範囲です');
	}
	const pointer = (text: string) => {
		if (!/^[\da-f]{4}:[\da-f]{4}$/i.test(text ?? '')) invalid('文字列領域の参照が不正です');
		return parseInt(text.replace(':', ''), 16);
	};
	const poolStart = pointer(storage[0]);
	const poolSize = pointer(storage[1]) - poolStart;
	if (poolSize < 0 || poolSize > 65535) invalid('文字列領域の長さが不正です');
	const lineOffset = headerSize;
	const arcOffset = lineOffset + counts[0] * 22;
	const textOffset = arcOffset + counts[1] * 32;
	const poolOffset = textOffset + counts[2] * 24;
	const pointOffset = poolOffset + poolSize;
	const namesOffset = pointOffset + counts[3] * 12;
	if (namesOffset + 2304 !== bytes.length) {
		invalid('図形数とファイル長が一致しません。未対応のJWC構造か破損データです');
	}
	const decoder = new TextDecoder('shift-jis');
	const name = (offset: number, length: number) =>
		decoder.decode(bytes.subarray(offset, offset + length)).replace(/\0.*$/s, '').trim();
	const visibleOffset = 1797 + (floatScales ? 64 : 32) + 272;
	const warnings = new Set<string>([
		'JWCの元のRGB配色は取得できないため、ペン番号に既定色を割り当てます。線種・文字寸法は属性として保持します。'
	]);
	const header: JwwHeader = {
		version: 0,
		scales: Array.from({ length: 16 }, (_, i) => {
			const scale = floatScales ? f32(1797 + i * 4) : u16(1797 + i * 2);
			if (scale <= 0) {
				warnings.add('縮尺が0のグループは1/1として扱います。');
				return 1;
			}
			return scale;
		}),
		groupStates: Array.from({ length: 16 }, (_, i) => u8(visibleOffset + i) & 1),
		layerStates: Array.from(
			{ length: 16 },
			(_, g) => Array.from({ length: 16 }, (_, l) => u8(visibleOffset + 16 + g * 16 + l) & 1)
		),
		groupNames: Array.from({ length: 16 }, (_, g) => name(namesOffset + 2048 + 16 * g, 16)),
		layerNames: Array.from(
			{ length: 16 },
			(_, g) => Array.from({ length: 16 }, (_, l) => name(namesOffset + 8 * (g * 16 + l), 8))
		),
		colors: new Map(PALETTE.map((color, index) => [index, color]))
	};
	const entities: JwwEntity[] = [];
	const xy = (
		offset: number
	) => [
		f32(offset) * paper[0] / 518 - paper[0] / 2,
		f32(offset + 4) * paper[0] / 518 - paper[1] / 2
	];
	const base = (kind: string, packed: number, pen: number, flags = 0): JwwEntity => {
		if (pen < 1 || pen > 9) invalid('未対応のペン色番号です');
		return {
			kind,
			curve: 0,
			penStyle: 1,
			penColor: pen,
			penWidth: 0,
			layer: packed & 15,
			group: packed >> 4,
			flags,
			values: []
		};
	};
	const stroke = (kind: string, offset: number) => {
		const e = base(kind, u8(offset + 2), u8(offset + 1), u16(offset + 4));
		e.penStyle = u8(offset) & 15;
		if (e.penStyle < 1 || e.penStyle > 9) invalid('未対応の線種です');
		if ((u8(offset) & 240) || u8(offset + 3) || e.flags) {
			warnings.add('曲線グループなどの補助属性は通常の図形として描画します。');
		}
		return e;
	};
	for (let i = 0; i < counts[0]; i++) {
		const offset = lineOffset + i * 22;
		const e = stroke('CDataSen', offset + 16);
		e.values = [...xy(offset), ...xy(offset + 8)];
		entities.push(e);
	}
	const angle = (offset: number) => {
		const degrees = u32(offset) / 65536;
		if (degrees >= 360) invalid('未対応の円弧角度です');
		return degrees * Math.PI / 180;
	};
	for (let i = 0; i < counts[1]; i++) {
		const offset = arcOffset + i * 32;
		const e = stroke('CDataEnko', offset + 26);
		const start = angle(offset + 14), end = angle(offset + 18);
		const flatness = u16(offset + 12) / 10000;
		if (flatness <= 0 || flatness > 1) invalid('楕円の扁平率が不正です');
		e.values = [
			...xy(offset),
			f32(offset + 8) * paper[0] / 518,
			start,
			(end - start + Math.PI * 2) % (Math.PI * 2),
			angle(offset + 22),
			flatness,
			start === end ? 1 : 0
		];
		entities.push(e);
	}
	let cursor = 0;
	for (let i = 0; i < counts[2]; i++) {
		const offset = textOffset + i * 24;
		const relative = (u32(offset + 16) - poolStart) >>> 0;
		if (relative !== cursor || relative >= poolSize) {
			invalid('文字列参照が範囲外か重複しています');
		}
		const data = bytes.subarray(
			poolOffset + relative,
			poolOffset + Math.min(poolSize, relative + 257)
		);
		const end = data.indexOf(0);
		if (end < 0) invalid('文字列の終端がありません');
		cursor += end + 1;
		const preset = u8(offset + 20);
		if (preset < 1 || preset > 10) invalid('文字種番号が不正です');
		const e = base('CDataMoji', u8(offset + 21), u16(1709 + preset * 2), u16(offset + 22));
		const a = xy(offset), b = xy(offset + 8);
		e.values = [
			...a,
			...b,
			preset,
			u16(1731 + preset * 2) / 10,
			u16(1753 + preset * 2) / 10,
			u16(1775 + preset * 2) / 10,
			Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
		];
		e.text = decoder.decode(data.subarray(0, end));
		e.font = '';
		entities.push(e);
	}
	if (cursor !== poolSize) invalid('参照されていない文字列領域があります');
	for (let i = 0; i < counts[3]; i++) {
		const offset = pointOffset + i * 12;
		const e = base('CDataTen', u8(offset + 8), u8(offset + 9), u16(offset + 10));
		e.values = [...xy(offset), 0];
		entities.push(e);
	}
	if (counts[4]) warnings.add(`仮点 ${counts[4]} 件は図形から除外しました。`);
	try {
		const result = convertJwCadDocument({ header, entities, definitions: [], imageCount: 0 });
		return { ...result, version: null, warnings: [...warnings, ...result.warnings] };
	} catch (error) {
		throw new Error(
			error instanceof Error ? error.message.replaceAll('JWW', 'JWC') : String(error)
		);
	}
};
