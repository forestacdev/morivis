/**
 * Format spec:
 * - https://www.moj.go.jp/content/000116464.pdf
 *
 * References:
 * - https://www.moj.go.jp/MINJI/minji05_00494.html
 * - https://front.geospatial.jp/moj-chizu-xml-readme/
 */

import {
	getJapanPlaneRectangularEpsg,
	getJapanPlaneRectangularProj4ByEpsg
} from '../../proj/japan-plane-rectangular';

// ---- Types ----

type Point = [number, number];
type Curve = [number, number];
type Surface = [number, number][][];

interface Feature {
	type: 'Feature';
	geometry: {
		type: 'MultiPolygon';
		coordinates: [number, number][][][];
	} | null;
	properties: Record<string, string | null>;
}

interface FeatureCollection {
	type: 'FeatureCollection';
	features: Feature[];
}

interface ParseOptions {
	includeArbitraryCrs?: boolean;
	includeChikugai?: boolean;
}

// ---- Constants ----

const NS_TIZUXML = 'http://www.moj.go.jp/MINJI/tizuxml';
const NS_TIZUZUMEN = 'http://www.moj.go.jp/MINJI/tizuzumen';

const getSourceCrs = (crsText: string): string | null => {
	if (crsText === '任意座標系') return null;

	const match = crsText.match(/^公共座標(\d{1,2})系$/);
	if (!match) return null;

	return getJapanPlaneRectangularEpsg(Number(match[1]), 'jgd2000');
};

// ---- XML Helper ----

const getChildElements = (parent: Element) => {
	return Array.from(parent.childNodes).filter((child): child is Element => child.nodeType === 1);
};

const parseXmlDocument = async (text: string): Promise<Document> => {
	if (typeof DOMParser !== 'undefined') {
		return new DOMParser().parseFromString(text, 'text/xml');
	}

	const { DOMParser: XmldomParser } = await import('@xmldom/xmldom');
	return new XmldomParser().parseFromString(text, 'text/xml') as unknown as Document;
};

const findElement = (parent: Element, localName: string, ns: string): Element | null => {
	const children = getChildElements(parent);
	for (let i = 0; i < children.length; i++) {
		if (children[i].localName === localName && children[i].namespaceURI === ns) {
			return children[i];
		}
	}
	return null;
};

const findAllElements = (parent: Element, localName: string, ns: string): Element[] => {
	const result: Element[] = [];
	const children = getChildElements(parent);
	for (let i = 0; i < children.length; i++) {
		if (children[i].localName === localName && children[i].namespaceURI === ns) {
			result.push(children[i]);
		}
	}
	return result;
};

const findElementDeep = (parent: Element, localName: string, ns: string): Element | null => {
	if (parent.localName === localName && parent.namespaceURI === ns) return parent;
	const children = getChildElements(parent);
	for (let i = 0; i < children.length; i++) {
		const found = findElementDeep(children[i], localName, ns);
		if (found) return found;
	}
	return null;
};

const findAllElementsDeep = (parent: Element, localName: string, ns: string): Element[] => {
	const result: Element[] = [];
	const walk = (el: Element) => {
		if (el.localName === localName && el.namespaceURI === ns) {
			result.push(el);
		}
		const children = getChildElements(el);
		for (let i = 0; i < children.length; i++) {
			walk(children[i]);
		}
	};
	walk(parent);
	return result;
};

// ---- Parse functions ----

const parseBaseProperties = (root: Element): Record<string, string | null> => {
	const getText = (name: string): string | null => {
		const el = findElement(root, name, NS_TIZUXML);
		return el?.textContent ?? null;
	};
	return {
		地図名: getText('地図名'),
		市区町村コード: getText('市区町村コード'),
		市区町村名: getText('市区町村名'),
		座標系: getText('座標系'),
		測地系判別: getText('測地系判別')
	};
};

const parsePoints = (spatialElem: Element): Map<string, Point> => {
	const points = new Map<string, Point>();

	for (const point of findAllElements(spatialElem, 'GM_Point', NS_TIZUZUMEN)) {
		const pos = findElementDeep(point, 'DirectPosition', NS_TIZUZUMEN);
		if (!pos) continue;

		let x: number | null = null;
		let y: number | null = null;
		const positionChildren = getChildElements(pos);
		for (let i = 0; i < positionChildren.length; i++) {
			const child = positionChildren[i];
			if (child.localName === 'X' && child.namespaceURI === NS_TIZUZUMEN) {
				x = parseFloat(child.textContent!);
			} else if (child.localName === 'Y' && child.namespaceURI === NS_TIZUZUMEN) {
				y = parseFloat(child.textContent!);
			}
		}
		if (x !== null && y !== null) {
			points.set(point.getAttribute('id')!, [x, y]);
		}
	}
	return points;
};

const parseCurves = (spatialElem: Element, points: Map<string, Point>): Map<string, Curve> => {
	const curves = new Map<string, Curve>();

	for (const curve of findAllElements(spatialElem, 'GM_Curve', NS_TIZUZUMEN)) {
		const columns = findAllElementsDeep(curve, 'GM_PointArray.column', NS_TIZUZUMEN);
		if (columns.length < 1) continue;
		const column = columns[0];
		const columnChildren = getChildElements(column);
		if (columnChildren.length < 1) continue;

		const pos = columnChildren[0];
		let x: number | null = null;
		let y: number | null = null;

		if (pos.localName === 'GM_Position.indirect' && pos.namespaceURI === NS_TIZUZUMEN) {
			const ref = getChildElements(pos)[0];
			const idref = ref.getAttribute('idref')!;
			const pt = points.get(idref);
			if (pt) {
				[x, y] = pt;
			}
		} else if (pos.localName === 'GM_Position.direct' && pos.namespaceURI === NS_TIZUZUMEN) {
			const positionChildren = getChildElements(pos);
			for (let i = 0; i < positionChildren.length; i++) {
				const child = positionChildren[i];
				if (child.localName === 'X' && child.namespaceURI === NS_TIZUZUMEN) {
					x = parseFloat(child.textContent!);
				} else if (child.localName === 'Y' && child.namespaceURI === NS_TIZUZUMEN) {
					y = parseFloat(child.textContent!);
				}
			}
		}

		if (x !== null && y !== null) {
			curves.set(curve.getAttribute('id')!, [y, x]);
		}
	}
	return curves;
};

const parseSurfaces = (spatialElem: Element, curves: Map<string, Curve>): Map<string, Surface> => {
	const surfaces = new Map<string, Surface>();

	for (const surface of findAllElements(spatialElem, 'GM_Surface', NS_TIZUZUMEN)) {
		const polygons = findAllElementsDeep(surface, 'GM_Polygon', NS_TIZUZUMEN);
		if (polygons.length < 1) continue;
		const polygon = polygons[0];
		const surfaceId = surface.getAttribute('id')!;
		const rings: [number, number][][] = [];

		// exterior ring
		const exterior = findElementDeep(polygon, 'GM_SurfaceBoundary.exterior', NS_TIZUZUMEN);
		if (exterior) {
			const gmRing = findElementDeep(exterior, 'GM_Ring', NS_TIZUZUMEN);
			if (gmRing) {
				const ring: [number, number][] = [];
				const ringChildren = getChildElements(gmRing);
				for (let i = 0; i < ringChildren.length; i++) {
					const cc = ringChildren[i];
					const curveId = cc.getAttribute('idref');
					if (curveId && curves.has(curveId)) {
						ring.push(curves.get(curveId)! as [number, number]);
					}
				}
				if (ring.length > 0) {
					ring.push(ring[0]);
					rings.push(ring);
				}
			}
		}

		// interior rings (holes)
		const interiors = findAllElementsDeep(polygon, 'GM_SurfaceBoundary.interior', NS_TIZUZUMEN);
		for (const interior of interiors) {
			const gmRing = findElementDeep(interior, 'GM_Ring', NS_TIZUZUMEN);
			if (gmRing) {
				const ring: [number, number][] = [];
				const ringChildren = getChildElements(gmRing);
				for (let i = 0; i < ringChildren.length; i++) {
					const cc = ringChildren[i];
					const curveId = cc.getAttribute('idref');
					if (curveId && curves.has(curveId)) {
						ring.push(curves.get(curveId)! as [number, number]);
					}
				}
				if (ring.length > 0) {
					ring.push(ring[0]);
					rings.push(ring);
				}
			}
		}

		surfaces.set(surfaceId, rings);
	}
	return surfaces;
};

const parseFeatures = (
	subjectElem: Element,
	surfaces: Map<string, Surface>,
	includeChikugai: boolean
): Feature[] => {
	const features: Feature[] = [];

	for (const fude of findAllElements(subjectElem, '筆', NS_TIZUXML)) {
		const fudeId = fude.getAttribute('id')!;
		const properties: Record<string, string | null> = {
			筆ID: fudeId,
			精度区分: null,
			大字コード: null,
			丁目コード: null,
			小字コード: null,
			予備コード: null,
			大字名: null,
			丁目名: null,
			小字名: null,
			予備名: null,
			地番: null,
			座標値種別: null,
			筆界未定構成筆: null,
			地図名: null,
			市区町村コード: null,
			市区町村名: null,
			座標系: null,
			測地系判別: null
		};

		let geometry: Feature['geometry'] = null;

		const fudeChildren = getChildElements(fude);
		for (let i = 0; i < fudeChildren.length; i++) {
			const entry = fudeChildren[i];
			const key = entry.localName;
			if (key === '形状') {
				const idref = entry.getAttribute('idref');
				if (idref && surfaces.has(idref)) {
					geometry = {
						type: 'MultiPolygon',
						coordinates: [surfaces.get(idref)!]
					};
				}
			} else {
				properties[key] = entry.textContent;
			}
		}

		if (!includeChikugai) {
			const chiban = properties['地番'] ?? '';
			if (chiban.includes('地区外') || chiban.includes('別図')) {
				continue;
			}
		}

		features.push({ type: 'Feature', geometry, properties });
	}

	return features;
};

// ---- Coordinate Transform ----

/**
 * proj4js を外部から注入するためのインターフェース。
 * ブラウザで使う場合は `import proj4 from "proj4"` して渡す。
 * proj4 が不要な場合（任意座標系のみ）は省略可能。
 */
type Proj4Forward = (coord: [number, number]) => [number, number];

const createTransformer = (
	proj4: ((fromProjection: string, toProjection: string) => { forward: Proj4Forward; }) | null,
	sourceCrs: string
): Proj4Forward | null => {
	if (!proj4) return null;
	const def = getJapanPlaneRectangularProj4ByEpsg(sourceCrs, 'jgd2000');
	if (!def) return null;
	return proj4(def, '+proj=longlat +datum=WGS84 +no_defs').forward;
};

const roundCoord = (v: number): number => Math.trunc(v * 1_000_000_000) / 1_000_000_000;

// ---- Main Entry Point ----

/**
 * XML文字列を受け取り、GeoJSON FeatureCollection を返す。
 *
 * @param xmlString - 法務省地図XMLの文字列
 * @param options - パースオプション
 * @param proj4 - proj4js のインスタンス（座標変換が必要な場合）
 *
 * @example
 * ```ts
 * import proj4 from "proj4";
 * const xml = await fetch("map.xml").then(r => r.text());
 * const geojson = parseMojXml(xml, {}, proj4);
 * ```
 */
export const parseMojXml = async (
	xmlString: string,
	options: ParseOptions = {},
	proj4: ((fromProjection: string, toProjection: string) => { forward: Proj4Forward; }) | null =
		null
): Promise<FeatureCollection> => {
	const { includeArbitraryCrs = false, includeChikugai = false } = options;

	const xmlDoc = await parseXmlDocument(xmlString);
	const doc = xmlDoc.documentElement;

	// 座標参照系を取得
	const crsElem = findElement(doc, '座標系', NS_TIZUXML);
	const crsText = crsElem?.textContent ?? '';
	const sourceCrs = getSourceCrs(crsText);

	if (!includeArbitraryCrs && sourceCrs === null) {
		return { type: 'FeatureCollection', features: [] };
	}

	// 空間属性をパース
	const spatialElem = findElement(doc, '空間属性', NS_TIZUXML);
	if (!spatialElem) {
		return { type: 'FeatureCollection', features: [] };
	}

	const points = parsePoints(spatialElem);
	const curves = parseCurves(spatialElem, points);

	// 平面直角座標系 → WGS84 変換
	if (sourceCrs !== null) {
		const forward = createTransformer(proj4, sourceCrs);
		if (forward) {
			for (const [curveId, [x, y]] of curves) {
				const [lng, lat] = forward([x, y]);
				curves.set(curveId, [lng, lat]);
			}
		}
	}

	// 小数点以下9桁に丸める
	for (const [curveId, [x, y]] of curves) {
		curves.set(curveId, [roundCoord(x), roundCoord(y)]);
	}

	const surfaces = parseSurfaces(spatialElem, curves);

	// 主題属性から筆を取得
	const subjectElem = findElement(doc, '主題属性', NS_TIZUXML);
	if (!subjectElem) {
		return { type: 'FeatureCollection', features: [] };
	}

	const features = parseFeatures(subjectElem, surfaces, includeChikugai);

	// ルート要素の属性情報を各Featureに付与
	const baseProps = parseBaseProperties(doc);
	for (const feature of features) {
		Object.assign(feature.properties, baseProps);
	}

	return { type: 'FeatureCollection', features };
};

export type { Feature, FeatureCollection, ParseOptions };
