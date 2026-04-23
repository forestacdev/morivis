/**
 * KML / KMZ パーサー
 *
 * - KML仕様: https://developers.google.com/kml/documentation/kmlreference
 * - OpenLayers KML format: https://openlayers.org/en/latest/apidoc/module-ol_format_KML-KML.html
 */

import JSZip from 'jszip';
import KML from 'ol/format/KML.js';
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { FeatureProp } from '$routes/map/types/properties';
import { geometryToGeoJSON } from '$routes/map/utils/formats/transformers/geometry';

/**
 * descriptionに埋め込まれたHTMLテーブルからkey-valueペアを抽出する
 * 例: <table><tr><td>撮影地区</td><td>大館鹿角</td></tr></table>
 */
const extractPropertiesFromDescription = (description: string): Record<string, string> => {
	const props: Record<string, string> = {};
	const rowRegex = /<tr[^>]*>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/gi;
	let match;
	while ((match = rowRegex.exec(description)) !== null) {
		const key = match[1].replace(/<[^>]*>/g, '').trim();
		const value = match[2].replace(/<[^>]*>/g, '').trim();
		if (key) {
			props[key] = value;
		}
	}
	return props;
};

/**
 * KMLカラー(aabbggrr)を#rrggbbに変換する
 */
const kmlColorToHex = (kmlColor: string): string => {
	const c = kmlColor.replace(/\s/g, '').toLowerCase();
	if (c.length !== 8) return '#000000';
	const r = c.slice(6, 8);
	const g = c.slice(4, 6);
	const b = c.slice(2, 4);
	return `#${r}${g}${b}`;
};

/** Style/StyleMapのid→色マッピングを構築する */
const parseKmlStyles = (
	text: string
): { fillColors: Map<string, string>; lineColors: Map<string, string> } => {
	const fillColors = new Map<string, string>();
	const lineColors = new Map<string, string>();

	const parser = new DOMParser();
	const doc = parser.parseFromString(text, 'text/xml');
	const ns = 'http://www.opengis.net/kml/2.2';

	// StyleMapのnormalスタイル参照を解決するためのマップ
	const styleMapNormal = new Map<string, string>();
	for (const sm of doc.getElementsByTagNameNS(ns, 'StyleMap')) {
		const id = sm.getAttribute('id');
		if (!id) continue;
		for (const pair of sm.getElementsByTagNameNS(ns, 'Pair')) {
			const key = pair.getElementsByTagNameNS(ns, 'key')[0]?.textContent?.trim();
			if (key === 'normal') {
				const url = pair.getElementsByTagNameNS(ns, 'styleUrl')[0]?.textContent?.trim();
				if (url) styleMapNormal.set(id, url.replace(/^#/, ''));
			}
		}
	}

	// Style要素からfill/lineカラーを取得
	const extractColorsFromStyle = (style: Element): { fill?: string; line?: string } => {
		const result: { fill?: string; line?: string } = {};
		const polyStyle = style.getElementsByTagNameNS(ns, 'PolyStyle')[0];
		if (polyStyle) {
			const color = polyStyle.getElementsByTagNameNS(ns, 'color')[0]?.textContent?.trim();
			if (color) result.fill = kmlColorToHex(color);
		}
		const lineStyle = style.getElementsByTagNameNS(ns, 'LineStyle')[0];
		if (lineStyle) {
			const color = lineStyle.getElementsByTagNameNS(ns, 'color')[0]?.textContent?.trim();
			if (color) result.line = kmlColorToHex(color);
		}
		return result;
	};

	// 全Styleを登録
	const styleById = new Map<string, { fill?: string; line?: string }>();
	for (const style of doc.getElementsByTagNameNS(ns, 'Style')) {
		const id = style.getAttribute('id');
		if (!id) continue;
		const colors = extractColorsFromStyle(style);
		styleById.set(id, colors);
		if (colors.fill) fillColors.set(id, colors.fill);
		if (colors.line) lineColors.set(id, colors.line);
	}

	// StyleMapをnormal参照先のスタイルで解決
	for (const [smId, normalId] of styleMapNormal) {
		const colors = styleById.get(normalId);
		if (colors) {
			if (colors.fill) fillColors.set(smId, colors.fill);
			if (colors.line) lineColors.set(smId, colors.line);
		}
	}

	return { fillColors, lineColors };
};

const parseKmlString = (
	text: string
): {
	geojson: FeatureCollection;
	fillColors: Map<string, string>;
	lineColors: Map<string, string>;
} => {
	const format = new KML({ extractStyles: false });
	const olFeatures = format.readFeatures(text);

	if (olFeatures.length === 0) {
		throw new Error('No features found in KML file');
	}

	const { fillColors, lineColors } = parseKmlStyles(text);

	const features = olFeatures
		.map((olFeature, index) => {
			const geometry = geometryToGeoJSON(olFeature.getGeometry()!);
			if (!geometry) return null;

			const properties = olFeature.getProperties();
			delete properties[olFeature.getGeometryName()];

			// descriptionにHTMLテーブルが含まれていれば属性を展開
			const desc = properties['description'];
			if (typeof desc === 'string' && /<table[\s>]/i.test(desc)) {
				const extracted = extractPropertiesFromDescription(desc);
				if (Object.keys(extracted).length > 0) {
					delete properties['description'];
					Object.assign(properties, extracted);
				}
			}

			// styleUrlからカラーを解決してプロパティに付与
			const styleUrl = properties['styleUrl'];
			if (typeof styleUrl === 'string') {
				const styleId = styleUrl.replace(/^#/, '');
				const fill = fillColors.get(styleId);
				const line = lineColors.get(styleId);
				if (fill) properties['_kml_fill_color'] = fill;
				if (line) properties['_kml_line_color'] = line;
			}
			delete properties['styleUrl'];

			return {
				type: 'Feature' as const,
				id: olFeature.getId() ?? index,
				geometry,
				properties: properties as FeatureProp
			};
		})
		.filter((f): f is NonNullable<typeof f> => f !== null);

	return { geojson: { type: 'FeatureCollection', features }, fillColors, lineColors };
};

/**
 * KMZファイルからKML文字列を取り出す
 */
const extractKmlFromKmz = async (file: File): Promise<string> => {
	const zip = await JSZip.loadAsync(await file.arrayBuffer());
	const kmlFileName = Object.keys(zip.files).find((name) => name.endsWith('.kml'));

	if (!kmlFileName) {
		throw new Error('No KML file found in KMZ');
	}

	return zip.files[kmlFileName].async('string');
};

export interface KmlParseResult {
	geojson: FeatureCollection;
	fillColors: Map<string, string>;
	lineColors: Map<string, string>;
}

/**
 * KMLファイルをパースしてGeoJSONとスタイル情報を返す
 */
export const kmlFileToGeoJson = async (file: File): Promise<KmlParseResult> => {
	try {
		const ext = file.name.split('.').pop()?.toLowerCase();
		const text = ext === 'kmz' ? await extractKmlFromKmz(file) : await file.text();
		return parseKmlString(text);
	} catch (error) {
		console.error('KML parsing error:', error);
		throw new Error('Failed to parse KML file');
	}
};

/**
 * KMLスタイルからデフォルトカラーを返す
 * ジオメトリタイプに応じてfill/lineを優先的に選択
 */
export const getKmlDefaultColor = (result: KmlParseResult, geometryType: string): string | null => {
	const { fillColors, lineColors } = result;
	const colors = geometryType === 'Polygon' ? fillColors : lineColors;
	const fallback = geometryType === 'Polygon' ? lineColors : fillColors;
	const first = colors.values().next().value ?? fallback.values().next().value;
	return first ?? null;
};
