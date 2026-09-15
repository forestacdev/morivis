import type { ColorMatchExpression } from '$routes/map/data/types/vector/style';
import type { FeatureCollection } from '$routes/map/types/geojson';
import { isHexColor } from '$routes/map/utils/deck/geojson-color';
import { XMLParser } from 'fast-xml-parser';

export type KmlStyleMaps = {
	fillColors: Map<string, string>;
	lineColors: Map<string, string>;
};

const kmlColorToHex = (kmlColor: string): string => {
	const c = kmlColor.replace(/\s/g, '').toLowerCase();
	if (c.length !== 8) return '#000000';
	const r = c.slice(6, 8);
	const g = c.slice(4, 6);
	const b = c.slice(2, 4);
	return `#${r}${g}${b}`;
};

export const parseKmlStyles = (text: string): KmlStyleMaps => {
	const fillColors = new Map<string, string>();
	const lineColors = new Map<string, string>();
	const parser = new XMLParser({
		ignoreAttributes: false,
		removeNSPrefix: true,
		parseTagValue: false
	});
	const parsed = parser.parse(text);

	const toArray = <T>(value: T | T[] | undefined): T[] => {
		if (value == null) return [];
		return Array.isArray(value) ? value : [value];
	};

	const collectNodesByName = (node: unknown, nodeName: string): Record<string, unknown>[] => {
		if (node == null || typeof node !== 'object') return [];

		if (Array.isArray(node)) {
			return node.flatMap((item) => collectNodesByName(item, nodeName));
		}

		const record = node as Record<string, unknown>;
		const matches = toArray(record[nodeName]).filter(
			(item): item is Record<string, unknown> => typeof item === 'object' && item !== null
		);

		return [
			...matches,
			...Object.values(record).flatMap((value) => collectNodesByName(value, nodeName))
		];
	};

	const styleMapNormal = new Map<string, string>();
	for (const sm of collectNodesByName(parsed, 'StyleMap')) {
		const id = typeof sm['@_id'] === 'string' ? sm['@_id'] : null;
		if (!id) continue;
		for (
			const pair of toArray(sm['Pair']).filter(
				(item): item is Record<string, unknown> => typeof item === 'object' && item !== null
			)
		) {
			const key = typeof pair['key'] === 'string' ? pair['key'].trim() : null;
			if (key === 'normal') {
				const url = typeof pair['styleUrl'] === 'string' ? pair['styleUrl'].trim() : null;
				if (url) styleMapNormal.set(id, url.replace(/^#/, ''));
			}
		}
	}

	const extractColorsFromStyle = (
		style: Record<string, unknown>
	): { fill?: string; line?: string; } => {
		const result: { fill?: string; line?: string; } = {};
		const polyStyle = style['PolyStyle'];
		const polyColor =
			typeof (polyStyle as Record<string, unknown> | undefined)?.['color'] === 'string'
				? ((polyStyle as Record<string, unknown>)['color'] as string).trim()
				: null;
		if (polyColor) {
			result.fill = kmlColorToHex(polyColor);
		}
		const lineStyle = style['LineStyle'];
		const lineColor =
			typeof (lineStyle as Record<string, unknown> | undefined)?.['color'] === 'string'
				? ((lineStyle as Record<string, unknown>)['color'] as string).trim()
				: null;
		if (lineColor) {
			result.line = kmlColorToHex(lineColor);
		}
		return result;
	};

	const styleById = new Map<string, { fill?: string; line?: string; }>();
	for (const style of collectNodesByName(parsed, 'Style')) {
		const id = typeof style['@_id'] === 'string' ? style['@_id'] : null;
		if (!id) continue;
		const colors = extractColorsFromStyle(style);
		styleById.set(id, colors);
		if (colors.fill) fillColors.set(id, colors.fill);
		if (colors.line) lineColors.set(id, colors.line);
	}

	for (const [smId, normalId] of styleMapNormal) {
		const colors = styleById.get(normalId);
		if (colors) {
			if (colors.fill) fillColors.set(smId, colors.fill);
			if (colors.line) lineColors.set(smId, colors.line);
		}
	}

	return { fillColors, lineColors };
};

export const applyStyleProperties = (
	properties: Record<string, unknown>,
	fillColors: Map<string, string>,
	lineColors: Map<string, string>
) => {
	const styleUrl = properties.styleUrl;
	const styleId = typeof styleUrl === 'string' ? styleUrl.replace(/^#/, '') : undefined;
	// toGeoJSONのstroke/fillは共有StyleとインラインStyleを解決済み。
	// 地物側の上書きを優先し、共有Styleの色を補完に使う。
	const fill = isHexColor(properties.fill)
		? properties.fill
		: styleId
		? fillColors.get(styleId)
		: undefined;
	const line = isHexColor(properties.stroke)
		? properties.stroke
		: styleId
		? lineColors.get(styleId)
		: undefined;
	if (fill) properties['_kml_fill_color'] = fill;
	if (line) properties['_kml_line_color'] = line;
	if (typeof styleUrl === 'string') delete properties.styleUrl;
};

export const getKmlDefaultColor = (
	result: KmlStyleMaps,
	geometryType: string
): string | null => {
	const { fillColors, lineColors } = result;
	const colors = geometryType === 'Polygon' ? fillColors : lineColors;
	const fallback = geometryType === 'Polygon' ? lineColors : fillColors;
	const first = colors.values().next().value ?? fallback.values().next().value;
	return first ?? null;
};

/** 選択した地物の色を、2Dの分類色と3Dの属性色へ同じ設定で渡す。 */
export const getKmlColorOptions = (geojson: FeatureCollection, geometryType: string): {
	defaultColor?: string;
	colorProperty?: string;
	extraColorExpressions?: ColorMatchExpression[];
} => {
	const keys = geometryType === 'Polygon'
		? ['_kml_fill_color', '_kml_line_color']
		: ['_kml_line_color', '_kml_fill_color'];
	for (const key of keys) {
		const colors = [
			...new Set(
				geojson.features.map((feature) => feature.properties?.[key]).filter(isHexColor)
			)
		];
		if (!colors.length) continue;
		return {
			defaultColor: colors[0],
			colorProperty: key,
			extraColorExpressions: [{
				type: 'match',
				key,
				name: 'KMLの色',
				mapping: { categories: colors, values: colors, patterns: colors.map(() => null) },
				noData: { value: colors[0], pattern: null }
			}]
		};
	}
	return {};
};
