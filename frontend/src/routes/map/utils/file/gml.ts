import GML from 'ol/format/GML.js';
import GML2 from 'ol/format/GML2.js';
import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

/**
 * 基盤地図情報（FGD）GML パーサー
 *
 * 仕様書:
 * - ファイル仕様書: https://service.gsi.go.jp/kiban/contents/screen/basismap/documents/FGD_DLFileSpecV5.2.pdf
 * - データの説明: https://fgd.gsi.go.jp/download/reference.html
 * - 各種資料: https://fgd.gsi.go.jp/download/documents.html
 */

const GML_NS = 'http://www.opengis.net/gml/3.2';
const FGD_NS = 'http://fgd.gsi.go.jp/spec/2008/FGD_GMLSchema';

/** 基盤地図情報のフィーチャータグ一覧 */
const FGD_FEATURE_TAGS = [
	'GCP',
	'ElevPt',
	'AdmPt',
	'SBAPt',
	'RdEdg',
	'Cntr',
	'AdmBdry',
	'CommBdry',
	'RdCompt',
	'BldL',
	'WL',
	'WStrL',
	'SBBdry',
	'BldA',
	'AdmArea',
	'WA',
	'WStrA'
] as const;

/** gml:posList テキストを [lon, lat][] 座標配列に変換（FGDは緯度経度順） */
const parsePosListText = (text: string): [number, number][] => {
	const values = text.trim().split(/\s+/).map(Number);
	const coords: [number, number][] = [];
	for (let i = 0; i < values.length - 1; i += 2) {
		coords.push([values[i + 1], values[i]]); // lat,lon → lon,lat
	}
	return coords;
};

/** gml:pos テキストを [lon, lat] に変換 */
const parsePosText = (text: string): [number, number] => {
	const [lat, lon] = text.trim().split(/\s+/).map(Number);
	return [lon, lat];
};

/** Point ジオメトリを抽出: <pos> → gml:Point → gml:pos */
const parsePointGeometry = (featureEl: Element): AnyGeometry | null => {
	const posEl =
		featureEl.getElementsByTagNameNS(FGD_NS, 'pos')[0] ?? featureEl.getElementsByTagName('pos')[0];
	if (!posEl) return null;

	const gmlPos = posEl.getElementsByTagNameNS(GML_NS, 'pos')[0];
	if (!gmlPos?.textContent) return null;

	return { type: 'Point', coordinates: parsePosText(gmlPos.textContent) };
};

/** Line ジオメトリを抽出: <loc> → gml:Curve → gml:posList */
const parseLineGeometry = (featureEl: Element): AnyGeometry | null => {
	const locEl =
		featureEl.getElementsByTagNameNS(FGD_NS, 'loc')[0] ?? featureEl.getElementsByTagName('loc')[0];
	if (!locEl) return null;

	const posLists = locEl.getElementsByTagNameNS(GML_NS, 'posList');
	if (posLists.length === 0) return null;

	// 複数セグメントの座標を結合
	const allCoords: [number, number][] = [];
	for (const posList of posLists) {
		if (posList.textContent) {
			allCoords.push(...parsePosListText(posList.textContent));
		}
	}

	if (allCoords.length === 0) return null;
	return { type: 'LineString', coordinates: allCoords };
};

/** Polygon ジオメトリを抽出: <area> → gml:Surface → gml:PolygonPatch → gml:posList */
const parsePolygonGeometry = (featureEl: Element): AnyGeometry | null => {
	const areaEl =
		featureEl.getElementsByTagNameNS(FGD_NS, 'area')[0] ??
		featureEl.getElementsByTagName('area')[0];
	if (!areaEl) return null;

	const patches = areaEl.getElementsByTagNameNS(GML_NS, 'PolygonPatch');
	if (patches.length === 0) return null;

	const rings: [number, number][][] = [];

	for (const patch of patches) {
		// exterior ring
		const exterior = patch.getElementsByTagNameNS(GML_NS, 'exterior')[0];
		if (exterior) {
			const posLists = exterior.getElementsByTagNameNS(GML_NS, 'posList');
			const coords: [number, number][] = [];
			for (const posList of posLists) {
				if (posList.textContent) {
					coords.push(...parsePosListText(posList.textContent));
				}
			}
			if (coords.length > 0) rings.push(coords);
		}

		// interior rings (holes)
		const interiors = patch.getElementsByTagNameNS(GML_NS, 'interior');
		for (const interior of interiors) {
			const posLists = interior.getElementsByTagNameNS(GML_NS, 'posList');
			const coords: [number, number][] = [];
			for (const posList of posLists) {
				if (posList.textContent) {
					coords.push(...parsePosListText(posList.textContent));
				}
			}
			if (coords.length > 0) rings.push(coords);
		}
	}

	if (rings.length === 0) return null;
	return { type: 'Polygon', coordinates: rings };
};

/** FGDフィーチャー要素からジオメトリを抽出 */
const parseFgdGeometry = (featureEl: Element): AnyGeometry | null =>
	parsePointGeometry(featureEl) ?? parseLineGeometry(featureEl) ?? parsePolygonGeometry(featureEl);

/** 既知のジオメトリ/メタ要素（プロパティから除外） */
const SKIP_PROPERTY_TAGS = new Set([
	'pos',
	'loc',
	'area',
	'fid',
	'lfSpanFr',
	'devDate',
	'orgGILvl'
]);

/** FGDフィーチャー要素からプロパティを抽出 */
const parseFgdProperties = (featureEl: Element): Record<string, string> => {
	const props: Record<string, string> = {};
	for (const child of featureEl.children) {
		const tag = child.localName;
		if (SKIP_PROPERTY_TAGS.has(tag)) continue;
		if (child.namespaceURI === GML_NS) continue;
		const text = child.textContent?.trim();
		if (text) props[tag] = text;
	}
	return props;
};

/** 基盤地図情報GMLかどうかを判定 */
const isFgdGml = (text: string): boolean => text.includes('fgd.gsi.go.jp');

/**
 * 基盤地図情報GMLをパースしてGeoJSONに変換
 */
const parseFgdGml = (text: string): FeatureCollection => {
	const parser = new DOMParser();
	const doc = parser.parseFromString(text, 'text/xml');

	const parserError = doc.querySelector('parsererror');
	if (parserError) {
		throw new Error('Invalid XML: ' + parserError.textContent);
	}

	const features: Feature[] = [];

	for (const tag of FGD_FEATURE_TAGS) {
		const elements =
			doc.getElementsByTagNameNS(FGD_NS, tag).length > 0
				? doc.getElementsByTagNameNS(FGD_NS, tag)
				: doc.getElementsByTagName(tag);

		for (const el of elements) {
			const geometry = parseFgdGeometry(el);
			if (!geometry) continue;

			const properties = parseFgdProperties(el);
			properties._featureType = tag;

			features.push({
				type: 'Feature',
				id: el.getAttributeNS(GML_NS, 'id') ?? undefined,
				geometry,
				properties: properties as unknown as FeatureProp
			});
		}
	}

	if (features.length === 0) {
		throw new Error('No features found in FGD GML file');
	}

	return { type: 'FeatureCollection', features };
};

/**
 * 汎用 GML パーサー (ol/format/GML)
 *
 * - GML 2: https://www.ogc.org/standard/gml/ (OGC GML 2.1.2)
 * - GML 3: https://www.ogc.org/standard/gml/ (OGC GML 3.1.1)
 * - OpenLayers GML format: https://openlayers.org/en/latest/apidoc/module-ol_format_GML-GML.html
 */

type GmlVersion = '2' | '3';

const detectGmlVersion = (text: string): GmlVersion => {
	if (text.includes('gml/3') || text.includes('GML/3')) return '3';
	if (text.includes('gml/2') || text.includes('GML/2')) return '2';
	return '3';
};

export const geometryToGeoJSON = (
	geometry: import('ol/geom/Geometry').default
): AnyGeometry | null => {
	if (!geometry) return null;

	const type = geometry.getType();

	switch (type) {
		case 'Point': {
			const coords = (geometry as import('ol/geom/Point').default).getCoordinates();
			return { type: 'Point', coordinates: [coords[0], coords[1]] as [number, number] };
		}
		case 'MultiPoint': {
			const coords = (geometry as import('ol/geom/MultiPoint').default).getCoordinates();
			return {
				type: 'MultiPoint',
				coordinates: coords.map((c) => [c[0], c[1]] as [number, number])
			};
		}
		case 'LineString': {
			const coords = (geometry as import('ol/geom/LineString').default).getCoordinates();
			return {
				type: 'LineString',
				coordinates: coords.map((c) => [c[0], c[1]] as [number, number])
			};
		}
		case 'MultiLineString': {
			const coords = (geometry as import('ol/geom/MultiLineString').default).getCoordinates();
			return {
				type: 'MultiLineString',
				coordinates: coords.map((line) => line.map((c) => [c[0], c[1]] as [number, number]))
			};
		}
		case 'Polygon': {
			const coords = (geometry as import('ol/geom/Polygon').default).getCoordinates();
			return {
				type: 'Polygon',
				coordinates: coords.map((ring) => ring.map((c) => [c[0], c[1]] as [number, number]))
			};
		}
		case 'MultiPolygon': {
			const coords = (geometry as import('ol/geom/MultiPolygon').default).getCoordinates();
			return {
				type: 'MultiPolygon',
				coordinates: coords.map((poly) =>
					poly.map((ring) => ring.map((c) => [c[0], c[1]] as [number, number]))
				)
			};
		}
		default:
			console.warn(`Unsupported geometry type: ${type}`);
			return null;
	}
};

const parseGenericGml = (text: string): FeatureCollection => {
	const version = detectGmlVersion(text);
	const format = version === '2' ? new GML2() : new GML();
	const olFeatures = format.readFeatures(text);

	if (olFeatures.length === 0) {
		throw new Error('No features found in GML file');
	}

	const features = olFeatures
		.map((olFeature, index) => {
			const geometry = geometryToGeoJSON(olFeature.getGeometry()!);
			if (!geometry) return null;

			const properties = olFeature.getProperties();
			delete properties[olFeature.getGeometryName()];

			return {
				type: 'Feature' as const,
				id: olFeature.getId() ?? index,
				geometry,
				properties: properties as FeatureProp
			};
		})
		.filter((f): f is NonNullable<typeof f> => f !== null);

	return { type: 'FeatureCollection', features };
};

// ---- エクスポート ----

/**
 * GMLファイルをパースしてGeoJSONのFeatureCollectionに変換する
 * 基盤地図情報GMLと汎用GMLの両方に対応
 */
export const gmlFileToGeoJson = async (file: File): Promise<FeatureCollection> => {
	try {
		const text = await file.text();

		if (isFgdGml(text)) {
			return parseFgdGml(text);
		}

		return parseGenericGml(text);
	} catch (error) {
		console.error('GML parsing error:', error);
		throw new Error('Failed to parse GML file');
	}
};
