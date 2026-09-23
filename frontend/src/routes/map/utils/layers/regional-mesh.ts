import type {
	DataDrivenPropertyValueSpecification,
	LayerSpecification,
	SourceSpecification
} from '$routes/map/utils/maplibre';
import { REGIONAL_MESH_BOUNDS, REGIONAL_MESH_LEVELS } from '$routes/map/utils/mesh/regional-mesh';

export const createRegionalMeshStyle = (
	enabled: boolean,
	textFont: DataDrivenPropertyValueSpecification<string[]>
) => {
	const sources: Record<string, SourceSpecification> = {};
	const layers: LayerSpecification[] = [];
	if (!enabled) return { sources, layers };
	for (const { level, minzoom, maxzoom } of REGIONAL_MESH_LEVELS) {
		const source = `regional-mesh-${level}`;
		sources[source] = {
			type: 'vector',
			tiles: [`regional_mesh://tile/${level}/{z}/{x}/{y}.pbf`],
			bounds: [...REGIONAL_MESH_BOUNDS],
			minzoom,
			maxzoom: Math.min(maxzoom - 1, 16)
		};
		const base = { source, 'source-layer': 'regional_mesh', minzoom, maxzoom };
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
				paint: { 'line-color': '#ff0000', 'line-width': 1, 'line-opacity': 0.9 }
			},
			{
				...base,
				id: `${source}-label`,
				type: 'symbol',
				minzoom: Math.max(minzoom, 4),
				filter: ['==', '$type', 'Point'],
				layout: {
					'text-field': ['get', 'code'],
					'text-font': textFont,
					'text-size': 12,
					'text-allow-overlap': false,
					'text-ignore-placement': false
				},
				paint: {
					'text-color': '#ff0000',
					'text-halo-color': '#ffffff',
					'text-halo-width': 1.5
				}
			}
		);
	}
	return { sources, layers };
};
