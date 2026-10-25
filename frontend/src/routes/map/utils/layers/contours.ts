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
	const lineWidth: DataDrivenPropertyValueSpecification<number> = [
		'case',
		['>', ['get', 'level'], 0],
		1,
		0.5
	];
	layers.push(
		{
			...base,
			id: `${source}-casing`,
			type: 'line',
			paint: {
				'line-color': '#ffffff',
				// 主線の両側に0.5pxずつ白い縁を出す。
				'line-width': ['+', lineWidth, 1],
				'line-opacity': 0.35
			}
		},
		{
			...base,
			id: `${source}-line`,
			type: 'line',
			paint: {
				'line-color': '#bfbfbf',
				'line-width': lineWidth,
				'line-opacity': ['case', ['>', ['get', 'level'], 0], 1.5, 0.8]
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
				'text-field': ['to-string', ['get', 'ele']],
				'text-font': textFont,
				'text-size': 12,
				'text-padding': 1,
				'text-allow-overlap': false,
				'text-ignore-placement': false
			},
			paint: {
				'text-color': '#434343',
				'text-halo-color': '#ffffff',
				'text-halo-width': 1.5
			}
		}
	);
	return { sources, layers };
};
