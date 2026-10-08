import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { formatOpenDrive } from './definition';

export type XmlNode = Record<string, unknown>;
export const node = (value: unknown): XmlNode =>
	value !== null && typeof value === 'object' && !Array.isArray(value) ? value as XmlNode : {};
export const children = (value: unknown): XmlNode[] =>
	value === undefined ? [] : (Array.isArray(value) ? value : [value]).map(node);
export const str = (item: XmlNode, key: string, fallback = ''): string =>
	item[`@_${key}`] === undefined ? fallback : String(item[`@_${key}`]);
export const num = (item: XmlNode, key: string, fallback?: number): number => {
	const text = str(item, key);
	if (!text.trim() && fallback !== undefined) return fallback;
	const value = Number(text);
	if (!text.trim() || !Number.isFinite(value)) {
		throw new Error(`OpenDRIVE: ${key}の数値が不正です`);
	}
	return value;
};

export const parseXml = (text: string): XmlNode => {
	if (text.length > formatOpenDrive.limits.maxTextLength) {
		throw new Error('OpenDRIVEのXMLが処理上限を超えています');
	}
	if (/<!DOCTYPE|<!ENTITY/i.test(text)) {
		throw new Error('OpenDRIVEのDTD・実体宣言には対応していません');
	}
	if (XMLValidator.validate(text) !== true) throw new Error('OpenDRIVEのXMLが壊れています');
	const parsed = new XMLParser({
		ignoreAttributes: false,
		parseTagValue: false,
		parseAttributeValue: false,
		removeNSPrefix: true
	}).parse(text);
	if (!parsed.OpenDRIVE || Array.isArray(parsed.OpenDRIVE)) {
		throw new Error('OpenDRIVE要素がありません');
	}
	return node(parsed.OpenDRIVE);
};

export interface Polynomial {
	s: number;
	a: number;
	b: number;
	c: number;
	d: number;
}
export const polynomials = (value: unknown, key = 's'): Polynomial[] => {
	const records = children(value).map(item => ({
		s: num(item, key),
		a: num(item, 'a'),
		b: num(item, 'b'),
		c: num(item, 'c'),
		d: num(item, 'd')
	}));
	for (let i = 0; i < records.length; i++) {
		if (records[i].s < 0 || (i > 0 && records[i].s <= records[i - 1].s)) {
			throw new Error('OpenDRIVEの多項式の開始位置が不正です');
		}
	}
	return records;
};
export const evaluatePolynomial = (p: Polynomial, ds: number): number =>
	((p.d * ds + p.c) * ds + p.b) * ds + p.a;
export const polynomialAt = (records: Polynomial[], s: number): number => {
	// 二分探索。多数の幅定義を持つ道路も点数×定義数の探索にしない。
	let lo = 0, hi = records.length;
	while (lo < hi) {
		const mid = (lo + hi) >>> 1;
		if (records[mid].s <= s + 1e-9) lo = mid + 1;
		else hi = mid;
	}
	const record = records[lo - 1];
	return record ? evaluatePolynomial(record, Math.max(0, s - record.s)) : 0;
};
