import type {
	DataDrivenPropertyValueSpecification,
	LayerSpecification,
	SourceSpecification
} from '$routes/map/utils/maplibre';
import { S2_LEVELS } from '$routes/map/utils/mesh/s2-levels';

export const createS2Style = (
	enabled: boolean,
	textFont: DataDrivenPropertyValueSpecification<string[]>
) => {
	const sources: Record<string, SourceSpecification> = {};
	const layers: LayerSpecification[] = [];
	if (!enabled) return { sources, layers };
	for (const { level, minzoom, maxzoom } of S2_LEVELS) {
		const source = `s2-${level}`;
		sources[source] = {
			type: 'vector',
			tiles: [`s2_grid://tile/${level}/{z}/{x}/{y}.pbf`],
			minzoom,
			maxzoom: maxzoom - 1
		};
		const base = { source, 'source-layer': 's2', minzoom, maxzoom };
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
				paint: { 'line-color': '#22d3ee', 'line-width': 1, 'line-opacity': 0.9 }
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
					'text-color': '#22d3ee',
					'text-halo-color': '#ffffff',
					'text-halo-width': 1.5
				}
			}
		);
	}
	return { sources, layers };
};
