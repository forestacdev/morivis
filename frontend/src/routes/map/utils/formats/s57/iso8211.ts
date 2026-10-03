import { formatS57 } from './definition';

export type Fields = Map<string, Uint8Array[]>;
const ascii = new TextDecoder('ascii');
const invalid = (): never => {
	throw new Error('S-57のISO 8211レコードが欠損または不正です');
};
const decimal = (bytes: Uint8Array, start: number, length: number) => {
	const text = ascii.decode(bytes.subarray(start, start + length));
	if (text.length !== length || !/^\d+$/.test(text)) return invalid();
	return Number(text);
};

/** バイナリ部分の終端文字を検索せず、directoryに記録された長さで区切る。 */
export const readRecords = (bytes: Uint8Array, visit: (fields: Fields, ddr: boolean) => void) => {
	let offset = 0;
	let count = 0;
	while (offset < bytes.length) {
		if (bytes.length - offset < 24) invalid();
		const leader = bytes.subarray(offset, offset + 24);
		const ddr = leader[6] === 76;
		if (count === 0 ? !ddr : leader[6] !== 68) {
			throw new Error(
				'S-57のDDR／データレコードを確認できません（省略ヘッダー形式は未対応です）'
			);
		}
		if (ddr && decimal(leader, 10, 2) !== 9) invalid();
		const base = decimal(leader, 12, 5);
		const lengthWidth = decimal(leader, 20, 1);
		const positionWidth = decimal(leader, 21, 1);
		const tagWidth = decimal(leader, 23, 1);
		if (
			!lengthWidth || !positionWidth || tagWidth !== 4 || base < 25
			|| offset + base > bytes.length || bytes[offset + base - 1] !== 30
		) invalid();
		const entrySize = tagWidth + lengthWidth + positionWidth;
		if ((base - 25) % entrySize !== 0) invalid();
		const fields: Fields = new Map();
		const ranges: { start: number; end: number; tag: string; }[] = [];
		let end = base;
		for (let cursor = offset + 24; cursor < offset + base - 1; cursor += entrySize) {
			const tag = ascii.decode(bytes.subarray(cursor, cursor + tagWidth));
			const length = decimal(bytes, cursor + tagWidth, lengthWidth);
			const start = base + decimal(bytes, cursor + tagWidth + lengthWidth, positionWidth);
			if (!length || offset + start + length > bytes.length) invalid();
			ranges.push({ start, end: start + length, tag });
			end = Math.max(end, start + length);
		}
		const length = decimal(leader, 0, 5) || end; // 100000バイト以上はrecord length=0。
		if (length !== end || !ranges.length) invalid();
		let previousEnd = base;
		for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
			if (range.start !== previousEnd) invalid();
			previousEnd = range.end;
		}
		for (const range of ranges) {
			const values = fields.get(range.tag) ?? [];
			values.push(bytes.subarray(offset + range.start, offset + range.end));
			fields.set(range.tag, values);
		}
		if (++count > formatS57.limits.maxSections) {
			throw new Error('S-57のレコード数が上限を超えています');
		}
		visit(fields, ddr);
		offset += length;
	}
	if (!count) invalid();
};

// S-57 3.1 Part 3のバイナリENCフィールド。DDRと一致するものだけを固定レイアウトで読む。
const FORMATS: Record<string, string> = {
	DSID: 'b11,b14,2b11,3A,2A(8),R(4),b11,2A,b11,b12,A',
	DSSI: '3b11,8b14',
	DSPM: 'b11,b14,3b11,b14,4b11,2b14,A',
	FRID: 'b11,b14,2b11,2b12,b11',
	FOID: 'b12,b14,b12',
	VRID: 'b11,b14,b12,b11',
	FSPT: 'B(40),3b11',
	VRPT: 'B(40),4b11',
	SG2D: '2b24',
	SG3D: '3b24',
	ATTF: 'b12,A',
	NATF: 'b12,A',
	ATTV: 'b12,A',
	FFPT: 'B(64),b11,A'
};
const expandFormat = (format: string) =>
	format.replace(/\s/g, '').split(',').flatMap(token => {
		const match = /^(\d*)(b[12][124]|[ABIR](?:\(\d*\))?)$/.exec(token);
		if (!match) throw new Error('S-57のDDRに未対応のフィールド形式があります');
		const count = Number(match[1] || 1);
		if (count < 1 || count > 32) invalid();
		return Array<string>(count).fill(match[2].replace(/\(\)/, ''));
	}).join(',');

export const readDefinitions = (fields: Fields): Set<string> => {
	const tags = new Set<string>();
	for (const [tag, expected] of Object.entries(FORMATS)) {
		const definitions = fields.get(tag);
		if (!definitions) continue;
		if (definitions.length !== 1) invalid();
		const field = stripTerminator(definitions[0]);
		const parts = ascii.decode(field.subarray(9)).split('\x1f');
		const format = parts[2];
		if (
			!format?.startsWith('(') || !format.endsWith(')')
			|| expandFormat(format.slice(1, -1)) !== expandFormat(expected)
		) {
			throw new Error(`S-57の${tag}は未対応の符号化です。バイナリENCを使用してください`);
		}
		tags.add(tag);
	}
	if (!tags.has('DSID') || !tags.has('DSPM') || !tags.has('FRID')) {
		throw new Error('S-57 ENCのフィールド定義を確認できませんでした');
	}
	return tags;
};

export const stripTerminator = (field: Uint8Array, wide = false) => {
	const size = wide ? 2 : 1;
	if (field.length < size || field[field.length - size] !== 30 || (wide && field.at(-1) !== 0)) {
		invalid();
	}
	return field.subarray(0, -size);
};

export const fieldReader = (bytes: Uint8Array) => {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let offset = 0;
	const take = (length: number) => {
		if (offset + length > bytes.length) invalid();
		const start = offset;
		offset += length;
		return start;
	};
	const text = (length?: number, level = 0): string => {
		const start = offset;
		if (length === undefined) {
			const width = level === 2 ? 2 : 1;
			while (
				offset < bytes.length
				&& !(bytes[offset] === 31 && (width === 1 || bytes[offset + 1] === 0))
			) take(width);
			length = offset - start;
			take(width);
		} else take(length);
		const value = bytes.subarray(start, start + length);
		if (level === 2) {
			if (length % 2) invalid();
			return new TextDecoder('utf-16le', { fatal: true }).decode(value);
		}
		if (level === 0 && value.some(byte => byte > 127)) {
			throw new Error('S-57のASCII文字列が不正です');
		}
		let result = '';
		for (const byte of value) result += String.fromCharCode(byte);
		return result;
	};
	return {
		u8: () => view.getUint8(take(1)),
		u16: () => view.getUint16(take(2), true),
		u32: () => view.getUint32(take(4), true),
		i32: () => view.getInt32(take(4), true),
		text,
		remaining: () => bytes.length - offset,
		end: () => {
			if (offset !== bytes.length) invalid();
		}
	};
};
