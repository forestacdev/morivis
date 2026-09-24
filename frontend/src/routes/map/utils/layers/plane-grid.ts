import type {
	DataDrivenPropertyValueSpecification,
	LayerSpecification,
	SourceSpecification
} from '$routes/map/utils/maplibre';
import { PLANE_GRID_BOUNDS, PLANE_GRID_LEVELS } from '$routes/map/utils/mesh/plane-grid-config';
import { getJapanPlaneRectangularSystems } from '$routes/map/utils/proj/japan-plane-rectangular';
import type { FeatureCollection, Point } from 'geojson';

const origins: FeatureCollection<Point, { zone: number; label: string; }> = {
	type: 'FeatureCollection',
	features: getJapanPlaneRectangularSystems().map(system => ({
		type: 'Feature',
		id: system.zone,
		properties: { zone: system.zone, label: `第${system.zone}系 原点` },
		geometry: { type: 'Point', coordinates: [system.originLongitude, system.originLatitude] }
	}))
};

export const createPlaneGridStyle = (
	enabled: boolean,
	zone: number,
	textFont: DataDrivenPropertyValueSpecification<string[]>
) => {
	const sources: Record<string, SourceSpecification> = {};
	const layers: LayerSpecification[] = [];
	if (!enabled) return { sources, layers };
	if (!Number.isInteger(zone) || zone < 1 || zone > 19) {
		throw new Error('Invalid plane grid zone');
	}
	for (const { spacing, minzoom, maxzoom } of PLANE_GRID_LEVELS) {
		// 系を変えたときはソースIDも変え、以前のタイルキャッシュを参照させない。
		const source = `plane-grid-${zone}-${spacing}`;
		sources[source] = {
			type: 'vector',
			tiles: [`plane_grid://tile/${zone}/${spacing}/{z}/{x}/{y}.pbf`],
			bounds: [...PLANE_GRID_BOUNDS],
			minzoom,
			maxzoom: Math.min(maxzoom - 1, 20)
		};
		const base = { source, 'source-layer': 'plane_grid', minzoom, maxzoom };
		layers.push(
			{
				...base,
				id: `${source}-casing`,
				type: 'line',
				paint: { 'line-color': '#000000', 'line-width': 3, 'line-opacity': 0.4 }
			},
			{
				...base,
				id: `${source}-line`,
				type: 'line',
				paint: {
					'line-color': '#22d3ee',
					'line-width': ['case', ['get', 'major'], 1.5, 1],
					'line-opacity': 0.9
				}
			},
			{
				...base,
				id: `${source}-label`,
				type: 'symbol',
				layout: {
					'symbol-placement': 'line',
					'symbol-spacing': 300,
					'text-field': ['get', 'label'],
					'text-font': textFont,
					'text-size': 12,
					'text-offset': [0, -0.7],
					'text-allow-overlap': false
				},
				paint: {
					'text-color': '#0891b2',
					'text-halo-color': '#ffffff',
					'text-halo-width': 1.5
				}
			}
		);
	}
	const originSource = 'plane-grid-origins';
	sources[originSource] = { type: 'geojson', data: origins };
	layers.push(
		{
			id: `${originSource}-point`,
			source: originSource,
			type: 'circle',
			paint: {
				'circle-radius': ['case', ['==', ['get', 'zone'], zone], 8, 5],
				'circle-color': ['case', ['==', ['get', 'zone'], zone], '#22d3ee', '#0891b2'],
				'circle-stroke-color': '#ffffff',
				'circle-stroke-width': 2
			}
		},
		{
			id: `${originSource}-label`,
			source: originSource,
			type: 'symbol',
			layout: {
				'text-field': ['get', 'label'],
				'text-font': textFont,
				'text-size': ['case', ['==', ['get', 'zone'], zone], 14, 12],
				'text-anchor': 'bottom',
				'text-offset': [0, -1],
				'text-allow-overlap': false,
				'symbol-sort-key': ['case', ['==', ['get', 'zone'], zone], 0, 1]
			},
			paint: {
				'text-color': '#0891b2',
				'text-halo-color': '#ffffff',
				'text-halo-width': 2
			}
		}
	);
	return { sources, layers };
};
