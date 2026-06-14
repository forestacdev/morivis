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
		removeNSPrefix: true
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
