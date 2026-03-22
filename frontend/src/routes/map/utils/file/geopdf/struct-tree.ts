/**
 * GeoPDF StructTree (Tagged PDF) から属性情報を抽出する
 *
 * QGISなどが出力するGeoPDFでは、StructTreeRoot にフィーチャーの属性が
 * UserProperties として格納される。MCIDでcontent streamのフィーチャーと紐付け。
 */

import {
	PDFDocument,
	PDFName,
	PDFRef,
	PDFDict as PdfLibDict,
	PDFArray as PdfLibArray,
	PDFString,
	PDFHexString,
	PDFNumber,
	PDFBool
} from 'pdf-lib';

export interface FeatureAttributes {
	/** MCID (Marked Content ID) — content streamの /feature <</MCID N>> BDC と対応 */
	mcid: number;
	/** 属性のキー・値マップ */
	properties: Record<string, string | number | boolean>;
}

const getVal = (obj: any, context: any): string | number | boolean | null => {
	if (!obj) return null;
	const o = obj instanceof PDFRef ? context.lookup(obj) : obj;
	if (o instanceof PDFString) return o.decodeText();
	if (o instanceof PDFHexString) return o.decodeText();
	if (o instanceof PDFNumber) return o.asNumber();
	if (o instanceof PDFBool) return o.asBoolean();
	if (o instanceof PDFName) return o.decodeText();
	return null;
};

/**
 * PDFバッファからStructTreeのフィーチャー属性を抽出
 * @returns MCIDをキーとした属性マップ
 */
export const extractFeatureAttributes = async (
	buffer: ArrayBuffer | Uint8Array
): Promise<Map<number, Record<string, string | number | boolean>>> => {
	const doc = await PDFDocument.load(buffer);
	const context = doc.context;
	const catalog = doc.catalog;

	const structTreeRef = catalog.get(PDFName.of('StructTreeRoot'));
	if (!structTreeRef) return new Map();

	const structTree = structTreeRef instanceof PDFRef ? context.lookup(structTreeRef) : structTreeRef;
	if (!(structTree instanceof PdfLibDict)) return new Map();

	const result = new Map<number, Record<string, string | number | boolean>>();

	// K はルートの子要素（Layer > feature の階層）
	const rootK = structTree.get(PDFName.of('K'));
	if (!rootK) return result;

	const collectFeatures = (node: any): void => {
		const obj = node instanceof PDFRef ? context.lookup(node) : node;

		if (obj instanceof PdfLibArray) {
			for (let i = 0; i < obj.size(); i++) {
				collectFeatures(obj.get(i));
			}
			return;
		}

		if (!(obj instanceof PdfLibDict)) return;

		const sVal = obj.get(PDFName.of('S'));
		const sName = sVal instanceof PDFName ? sVal.decodeText() : null;

		if (sName === '/feature' || sName === 'feature') {
			// フィーチャーノード — MCIDと属性を抽出
			const mcidVal = getVal(obj.get(PDFName.of('K')), context);
			const mcid = typeof mcidVal === 'number' ? mcidVal : typeof mcidVal === 'string' ? parseInt(mcidVal) : NaN;
			if (isNaN(mcid)) return;

			const properties: Record<string, string | number | boolean> = {};

			// A (Attributes) から UserProperties を抽出
			const aRef = obj.get(PDFName.of('A'));
			if (aRef) {
				extractUserProperties(aRef, context, properties);
			}

			result.set(mcid, properties);
		} else {
			// Layer等の中間ノード — 子要素を再帰
			const children = obj.get(PDFName.of('K'));
			if (children) {
				collectFeatures(children);
			}
		}
	};

	collectFeatures(rootK);
	return result;
};

const extractUserProperties = (
	aRef: any,
	context: any,
	properties: Record<string, string | number | boolean>
): void => {
	const aObj = aRef instanceof PDFRef ? context.lookup(aRef) : aRef;

	if (aObj instanceof PdfLibArray) {
		for (let i = 0; i < aObj.size(); i++) {
			extractUserProperties(aObj.get(i), context, properties);
		}
		return;
	}

	if (!(aObj instanceof PdfLibDict)) return;

	const oVal = aObj.get(PDFName.of('O'));
	if (!oVal || !(oVal instanceof PDFName) || oVal.decodeText() !== '/UserProperties') return;

	const p = aObj.get(PDFName.of('P'));
	if (!p) return;

	const pObj = p instanceof PDFRef ? context.lookup(p) : p;
	if (!(pObj instanceof PdfLibArray)) return;

	for (let j = 0; j < pObj.size(); j++) {
		const prop = pObj.get(j);
		const propObj = prop instanceof PDFRef ? context.lookup(prop) : prop;
		if (!(propObj instanceof PdfLibDict)) continue;

		const name = getVal(propObj.get(PDFName.of('N')), context);
		const value = getVal(propObj.get(PDFName.of('V')), context);

		if (typeof name === 'string' && value !== null) {
			properties[name] = value;
		}
	}
};
