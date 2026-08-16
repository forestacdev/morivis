import type { HillshadeLayerSpecification } from '$routes/map/utils/maplibre';

export const hillshadeLayers: HillshadeLayerSpecification[] = [
	{
		id: 'earthhillshade_layer',
		type: 'hillshade',
		source: 'terrain', // terrainソースを使用
		paint: {
			'hillshade-method': 'igor',
			'hillshade-illumination-altitude': 45,
			'hillshade-illumination-direction': 315,
			'hillshade-shadow-color': '#000000',
			'hillshade-highlight-color': '#646464',
			'hillshade-accent-color': '#000000',
			'hillshade-exaggeration': 0.3
		}
	}
];
