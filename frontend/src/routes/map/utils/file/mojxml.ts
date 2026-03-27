/**
 * Parse MOJ MAP XML files and convert to GeoJSON
 * Browser-compatible TypeScript implementation
 *
 * 法務省登記所備付地図データ (MOJ Map XML)
 * - 仕様書: https://www.moj.go.jp/content/000116464.pdf
 * - 法務省案内ページ: https://www.moj.go.jp/MINJI/minji05_00494.html
 * - G空間情報センター: https://front.geospatial.jp/moj-chizu-xml-readme/
 */

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

const CRS_MAP: Record<string, string | null> = {
	任意座標系: null,
	公共座標1系: 'epsg:2443',
	公共座標2系: 'epsg:2444',
	公共座標3系: 'epsg:2445',
	公共座標4系: 'epsg:2446',
	公共座標5系: 'epsg:2447',
	公共座標6系: 'epsg:2448',
	公共座標7系: 'epsg:2449',
	公共座標8系: 'epsg:2450',
	公共座標9系: 'epsg:2451',
	公共座標10系: 'epsg:2452',
	公共座標11系: 'epsg:2453',
	公共座標12系: 'epsg:2454',
	公共座標13系: 'epsg:2455',
	公共座標14系: 'epsg:2456',
	公共座標15系: 'epsg:2457',
	公共座標16系: 'epsg:2458',
	公共座標17系: 'epsg:2459',
	公共座標18系: 'epsg:2460',
	公共座標19系: 'epsg:2461'
};

// 日本の平面直角座標系 (JGD2000) の proj4 定義
// ブラウザで proj4js を使って座標変換するための定義
const PROJ4_DEFS: Record<string, string> = {
	'epsg:2443':
		'+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2444':
		'+proj=tmerc +lat_0=33 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2445':
		'+proj=tmerc +lat_0=36 +lon_0=132.1666666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2446':
		'+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2447':
		'+proj=tmerc +lat_0=36 +lon_0=134.3333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2448':
		'+proj=tmerc +lat_0=36 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2449':
		'+proj=tmerc +lat_0=36 +lon_0=137.1666666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2450':
		'+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2451':
		'+proj=tmerc +lat_0=36 +lon_0=139.8333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2452':
		'+proj=tmerc +lat_0=40 +lon_0=140.8333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2453':
		'+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2454':
		'+proj=tmerc +lat_0=44 +lon_0=142.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2455':
		'+proj=tmerc +lat_0=44 +lon_0=144.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2456':
		'+proj=tmerc +lat_0=26 +lon_0=142 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2457':
		'+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2458':
		'+proj=tmerc +lat_0=26 +lon_0=124 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2459':
		'+proj=tmerc +lat_0=26 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2460':
		'+proj=tmerc +lat_0=20 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs',
	'epsg:2461':
		'+proj=tmerc +lat_0=26 +lon_0=154 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs'
};

// ---- XML Helper ----

const findElement = (parent: Element, localName: string, ns: string): Element | null => {
	const children = parent.children;
	for (let i = 0; i < children.length; i++) {
		if (children[i].localName === localName && children[i].namespaceURI === ns) {
			return children[i];
		}
	}
	return null;
};

const findAllElements = (parent: Element, localName: string, ns: string): Element[] => {
	const result: Element[] = [];
	const children = parent.children;
	for (let i = 0; i < children.length; i++) {
		if (children[i].localName === localName && children[i].namespaceURI === ns) {
			result.push(children[i]);
		}
	}
	return result;
};

const findElementDeep = (parent: Element, localName: string, ns: string): Element | null => {
	if (parent.localName === localName && parent.namespaceURI === ns) return parent;
	for (let i = 0; i < parent.children.length; i++) {
		const found = findElementDeep(parent.children[i], localName, ns);
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
		for (let i = 0; i < el.children.length; i++) {
			walk(el.children[i]);
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
		for (let i = 0; i < pos.children.length; i++) {
			const child = pos.children[i];
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
		if (column.children.length < 1) continue;

		const pos = column.children[0];
		let x: number | null = null;
		let y: number | null = null;

		if (pos.localName === 'GM_Position.indirect' && pos.namespaceURI === NS_TIZUZUMEN) {
			const ref = pos.children[0];
			const idref = ref.getAttribute('idref')!;
			const pt = points.get(idref);
			if (pt) {
				[x, y] = pt;
			}
		} else if (pos.localName === 'GM_Position.direct' && pos.namespaceURI === NS_TIZUZUMEN) {
			for (let i = 0; i < pos.children.length; i++) {
				const child = pos.children[i];
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
				for (let i = 0; i < gmRing.children.length; i++) {
					const cc = gmRing.children[i];
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
				for (let i = 0; i < gmRing.children.length; i++) {
					const cc = gmRing.children[i];
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

		for (let i = 0; i < fude.children.length; i++) {
			const entry = fude.children[i];
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
	proj4: ((fromProjection: string, toProjection: string) => { forward: Proj4Forward }) | null,
	sourceCrs: string
): Proj4Forward | null => {
	if (!proj4) return null;
	const def = PROJ4_DEFS[sourceCrs];
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
export const parseMojXml = (
	xmlString: string,
	options: ParseOptions = {},
	proj4: ((fromProjection: string, toProjection: string) => { forward: Proj4Forward }) | null = null
): FeatureCollection => {
	const { includeArbitraryCrs = false, includeChikugai = false } = options;

	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
	const doc = xmlDoc.documentElement;

	// 座標参照系を取得
	const crsElem = findElement(doc, '座標系', NS_TIZUXML);
	const crsText = crsElem?.textContent ?? '';
	const sourceCrs = CRS_MAP[crsText] ?? null;

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
