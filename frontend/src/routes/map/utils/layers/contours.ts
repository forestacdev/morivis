import {
	CONTOUR_MAX_ZOOM,
	CONTOUR_MIN_ZOOM,
	MAPTERHORN_DEM_SOURCE
} from '$routes/map/utils/contours/config';
import type {
	DataDrivenPropertyValueSpecification,
	LayerSpecification,
	SourceSpecification
} from '$routes/map/utils/maplibre';

export const createContourStyle = (
	tileUrl: string | undefined,
	textFont: DataDrivenPropertyValueSpecification<string[]>
) => {
	const sources: Record<string, SourceSpecification> = {};
	const layers: LayerSpecification[] = [];
	if (!tileUrl) return { sources, layers };

	const source = 'aux-contours';
	sources[source] = {
		type: 'vector',
		tiles: [tileUrl],
		minzoom: CONTOUR_MIN_ZOOM,
		maxzoom: CONTOUR_MAX_ZOOM,
		attribution: MAPTERHORN_DEM_SOURCE.attribution
	};
	const base = { source, 'source-layer': 'contours', minzoom: CONTOUR_MIN_ZOOM };
	layers.push(
		{
			...base,
			id: `${source}-casing`,
			type: 'line',
			paint: { 'line-color': '#ffffff', 'line-width': 2.5, 'line-opacity': 0.35 }
		},
		{
			...base,
			id: `${source}-line`,
			type: 'line',
			paint: {
				'line-color': '#a87532',
				'line-width': ['case', ['>', ['get', 'level'], 0], 1.4, 0.8],
				'line-opacity': 0.9
			}
		},
		{
			...base,
			id: `${source}-label-overview`,
			type: 'symbol',
			maxzoom: 9,
			filter: ['>', ['get', 'level'], 0],
			layout: {
				// 短い等高線も長さ・曲率による除外を受けず、線上の点に水平配置する。
				'symbol-placement': 'point',
				'text-field': ['concat', ['to-string', ['get', 'ele']], ' m'],
				'text-font': textFont,
				'text-size': 11,
				'text-padding': 6,
				'text-allow-overlap': false,
				'text-ignore-placement': false
			},
			paint: {
				'text-color': '#80551f',
				'text-halo-color': '#ffffff',
				'text-halo-width': 1.5
			}
		},
		{
			...base,
			id: `${source}-label`,
			type: 'symbol',
			minzoom: 9,
			filter: ['>', ['get', 'level'], 0],
			layout: {
				'symbol-placement': 'line',
				'symbol-spacing': ['step', ['zoom'], 150, 11, 250],
				'text-field': ['concat', ['to-string', ['get', 'ele']], ' m'],
				'text-font': textFont,
				'text-size': 12,
				'text-max-angle': 90,
				'text-padding': 1,
				'text-allow-overlap': false,
				'text-ignore-placement': false
			},
			paint: {
				'text-color': '#80551f',
				'text-halo-color': '#ffffff',
				'text-halo-width': 1.5
			}
		}
	);
	return { sources, layers };
};
