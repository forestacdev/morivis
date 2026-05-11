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

const KML_NS = 'http://www.opengis.net/kml/2.2';
const GX_NS = 'http://www.google.com/kml/ext/2.2';

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

const getFirstChildText = (parent: Element, namespace: string, tagName: string) => {
	return parent.getElementsByTagNameNS(namespace, tagName)[0]?.textContent?.trim();
};

const extractPlacemarkProperties = (placemark: Element) => {
	const properties: Record<string, string | number | boolean> = {};

	const name = getFirstChildText(placemark, KML_NS, 'name');
	if (name) properties.name = name;

	const description = getFirstChildText(placemark, KML_NS, 'description');
	if (description) {
		if (/<table[\s>]/i.test(description)) {
			Object.assign(properties, extractPropertiesFromDescription(description));
		} else {
			properties.description = description;
		}
	}

	const styleUrl = getFirstChildText(placemark, KML_NS, 'styleUrl');
	if (styleUrl) properties.styleUrl = styleUrl;

	for (const dataElement of placemark.getElementsByTagNameNS(KML_NS, 'Data')) {
		const key = dataElement.getAttribute('name')?.trim();
		const value = getFirstChildText(dataElement, KML_NS, 'value');
		if (key && value) properties[key] = value;
	}

	for (const simpleDataElement of placemark.getElementsByTagNameNS(KML_NS, 'SimpleData')) {
		const key = simpleDataElement.getAttribute('name')?.trim();
		const value = simpleDataElement.textContent?.trim();
		if (key && value) properties[key] = value;
	}

	return properties as FeatureProp;
};

const applyStyleProperties = (
	properties: FeatureProp,
	fillColors: Map<string, string>,
	lineColors: Map<string, string>
) => {
	const styleUrl = properties.styleUrl;
	if (typeof styleUrl !== 'string') {
		return;
	}

	const styleId = styleUrl.replace(/^#/, '');
	const fill = fillColors.get(styleId);
	const line = lineColors.get(styleId);
	if (fill) properties['_kml_fill_color'] = fill;
	if (line) properties['_kml_line_color'] = line;
	delete properties.styleUrl;
};

const getTrackPointBearing = (
	previousCoordinate: [number, number] | null,
	nextCoordinate: [number, number] | null
) => {
	if (!previousCoordinate || !nextCoordinate) return null;

	const [fromLng, fromLat] = previousCoordinate;
	const [toLng, toLat] = nextCoordinate;
	const fromLatRad = (fromLat * Math.PI) / 180;
	const toLatRad = (toLat * Math.PI) / 180;
	const deltaLng = ((toLng - fromLng) * Math.PI) / 180;
	const y = Math.sin(deltaLng) * Math.cos(toLatRad);
	const x =
		Math.cos(fromLatRad) * Math.sin(toLatRad) -
		Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(deltaLng);

	return (Math.atan2(y, x) * 180) / Math.PI;
};

const parseTrackCoordinate = (value: string) => {
	const [lngText, latText, altitudeText] = value.trim().split(/\s+/);
	const lng = Number(lngText);
	const lat = Number(latText);
	if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

	return {
		coordinate2d: [lng, lat] as [number, number]
	};
};

const parseTrackFeatures = (
	doc: Document,
	fillColors: Map<string, string>,
	lineColors: Map<string, string>
) => {
	const features: {
		type: 'Feature';
		id: string | number;
		geometry: { type: 'Point'; coordinates: [number, number] };
		properties: FeatureProp;
	}[] = [];
	let featureIndex = 1000000;

	for (const placemark of doc.getElementsByTagNameNS(KML_NS, 'Placemark')) {
		const trackElements = placemark.getElementsByTagNameNS(GX_NS, 'Track');
		if (trackElements.length === 0) continue;

		const baseProperties = extractPlacemarkProperties(placemark);
		applyStyleProperties(baseProperties, fillColors, lineColors);

		Array.from(trackElements).forEach((trackElement, trackIndex) => {
			const whenValues = Array.from(trackElement.getElementsByTagNameNS(KML_NS, 'when'))
				.map((element) => element.textContent?.trim() ?? '')
				.filter((value) => value !== '');
			const coordValues = Array.from(trackElement.getElementsByTagNameNS(GX_NS, 'coord'))
				.map((element) => element.textContent?.trim() ?? '')
				.filter((value) => value !== '');
			const pointCount = Math.min(whenValues.length, coordValues.length);
			if (pointCount === 0) return;

			for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
				const parsed = parseTrackCoordinate(coordValues[pointIndex]);
				if (!parsed) continue;

				const previous = pointIndex > 0 ? parseTrackCoordinate(coordValues[pointIndex - 1]) : null;
				const next =
					pointIndex < pointCount - 1 ? parseTrackCoordinate(coordValues[pointIndex + 1]) : null;
				const properties = {
					...baseProperties,
					time: whenValues[pointIndex],
					track_index: trackIndex,
					track_point_index: pointIndex
				} as FeatureProp;
				const bearing =
					getTrackPointBearing(
						previous?.coordinate2d ?? parsed.coordinate2d,
						next?.coordinate2d ?? null
					) ?? undefined;
				if (bearing != null) {
					properties.angle = bearing;
				}

				features.push({
					type: 'Feature',
					id: featureIndex,
					geometry: {
						type: 'Point',
						coordinates: parsed.coordinate2d
					},
					properties
				});
				featureIndex += 1;
			}
		});
	}

	return features;
};

/** Style/StyleMapのid→色マッピングを構築する */
const parseKmlStyles = (
	text: string
): { fillColors: Map<string, string>; lineColors: Map<string, string> } => {
	const fillColors = new Map<string, string>();
	const lineColors = new Map<string, string>();

	const parser = new DOMParser();
	const doc = parser.parseFromString(text, 'text/xml');

	// StyleMapのnormalスタイル参照を解決するためのマップ
	const styleMapNormal = new Map<string, string>();
	for (const sm of doc.getElementsByTagNameNS(KML_NS, 'StyleMap')) {
		const id = sm.getAttribute('id');
		if (!id) continue;
		for (const pair of sm.getElementsByTagNameNS(KML_NS, 'Pair')) {
			const key = pair.getElementsByTagNameNS(KML_NS, 'key')[0]?.textContent?.trim();
			if (key === 'normal') {
				const url = pair.getElementsByTagNameNS(KML_NS, 'styleUrl')[0]?.textContent?.trim();
				if (url) styleMapNormal.set(id, url.replace(/^#/, ''));
			}
		}
	}

	// Style要素からfill/lineカラーを取得
	const extractColorsFromStyle = (style: Element): { fill?: string; line?: string } => {
		const result: { fill?: string; line?: string } = {};
		const polyStyle = style.getElementsByTagNameNS(KML_NS, 'PolyStyle')[0];
		if (polyStyle) {
			const color = polyStyle.getElementsByTagNameNS(KML_NS, 'color')[0]?.textContent?.trim();
			if (color) result.fill = kmlColorToHex(color);
		}
		const lineStyle = style.getElementsByTagNameNS(KML_NS, 'LineStyle')[0];
		if (lineStyle) {
			const color = lineStyle.getElementsByTagNameNS(KML_NS, 'color')[0]?.textContent?.trim();
			if (color) result.line = kmlColorToHex(color);
		}
		return result;
	};

	// 全Styleを登録
	const styleById = new Map<string, { fill?: string; line?: string }>();
	for (const style of doc.getElementsByTagNameNS(KML_NS, 'Style')) {
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
	const parser = new DOMParser();
	const doc = parser.parseFromString(text, 'text/xml');
	const format = new KML({ extractStyles: false });
	const olFeatures = format.readFeatures(text);

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

	features.push(...parseTrackFeatures(doc, fillColors, lineColors));

	if (features.length === 0) {
		throw new Error('No features found in KML file');
	}

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
