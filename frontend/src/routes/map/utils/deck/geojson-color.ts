import type { GeoArrowStyle } from '$routes/map/data/types/model';

type ColoredFeature = { properties: Record<string, unknown> | null; };
type Rgba = [number, number, number, number];

export const isHexColor = (value: unknown): value is string =>
	typeof value === 'string' && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value);

export const getGeoJsonColorProperties = (data: { features: readonly ColoredFeature[]; }) => {
	const keys = new Set<string>();
	for (const feature of data.features) {
		for (const [key, value] of Object.entries(feature.properties ?? {})) {
			if (isHexColor(value)) keys.add(key);
		}
	}
	return [...keys].sort();
};

export const hexToRgba = (color: string, alpha = 255): Rgba => {
	const normalized = color.replace('#', '');
	const hex = normalized.length === 3
		? normalized.split('').map((char) => char + char).join('')
		: normalized;
	if (!/^[\da-f]{6}$/i.test(hex)) return [64, 140, 255, alpha];
	return [
		parseInt(hex.slice(0, 2), 16),
		parseInt(hex.slice(2, 4), 16),
		parseInt(hex.slice(4, 6), 16),
		alpha
	];
};

export const createGeoJsonColorAccessors = (
	style: Pick<GeoArrowStyle, 'color' | 'colorProperty'>
) => {
	const { color, colorProperty } = style;
	const getColor = (alpha: number) => {
		const fallback = hexToRgba(color, alpha);
		if (!colorProperty) return fallback;
		const palette = new Map<string, Rgba>();
		return (feature: ColoredFeature): Rgba => {
			const value = feature.properties?.[colorProperty];
			if (!isHexColor(value)) return fallback;
			let rgba = palette.get(value);
			if (!rgba) {
				rgba = hexToRgba(value, alpha);
				palette.set(value, rgba);
			}
			return rgba;
		};
	};
	return {
		getFillColor: getColor(180),
		getLineColor: getColor(220),
		updateTriggers: {
			getFillColor: [color, colorProperty],
			getLineColor: [color, colorProperty]
		}
	};
};
