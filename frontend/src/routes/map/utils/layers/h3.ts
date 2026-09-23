import type {
	DataDrivenPropertyValueSpecification,
	LayerSpecification,
	SourceSpecification
} from '$routes/map/utils/maplibre';
import { H3_LEVELS } from '$routes/map/utils/mesh/h3-levels';

export const createH3Style = (
	enabled: boolean,
	textFont: DataDrivenPropertyValueSpecification<string[]>
) => {
	const sources: Record<string, SourceSpecification> = {};
	const layers: LayerSpecification[] = [];
	if (!enabled) return { sources, layers };
	for (const { resolution, minzoom, maxzoom } of H3_LEVELS) {
		const source = `h3-${resolution}`;
		sources[source] = {
			type: 'vector',
			tiles: [`h3_grid://tile/${resolution}/{z}/{x}/{y}.pbf`],
			minzoom,
			maxzoom: maxzoom - 1
		};
		const base = { source, 'source-layer': 'h3', minzoom, maxzoom };
		layers.push(
			{
				...base,
				id: `${source}-casing`,
				type: 'line',
				filter: ['==', '$type', 'LineString'],
				paint: { 'line-color': '#000000', 'line-width': 3, 'line-opacity': 0.55 }
			},
			{
				...base,
				id: `${source}-line`,
				type: 'line',
				filter: ['==', '$type', 'LineString'],
				paint: { 'line-color': '#f59e0b', 'line-width': 1, 'line-opacity': 0.9 }
			},
			{
				...base,
				id: `${source}-label`,
				type: 'symbol',
				filter: ['==', '$type', 'Point'],
				layout: {
					'text-field': ['get', 'code'],
					'text-font': textFont,
					'text-size': 12,
					'text-allow-overlap': false,
					'text-ignore-placement': false
				},
				paint: {
					'text-color': '#f59e0b',
					'text-halo-color': '#ffffff',
					'text-halo-width': 1.5
				}
			}
		);
	}
	return { sources, layers };
};
