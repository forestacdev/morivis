import type { SymbolLayerSpecification, LineLayerSpecification } from 'maplibre-gl';

export const boundarySources = {
	openmaptiles: {
		type: 'vector',
		url: 'https://tile.openstreetmap.jp/data/planet.json'
	}
};

export const boundaryLayers: LineLayerSpecification[] = [
	{
		id: 'admin_sub',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'boundary',
		filter: ['in', 'admin_level', 4, 6, 8],
		layout: { visibility: 'visible' },
		paint: {
			'line-color': 'rgba(255, 255, 255, 1)',
			'line-dasharray': [2, 1]
		}
	},
	{
		id: 'admin_country_z0-4',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'boundary',
		minzoom: 0,
		maxzoom: 5,
		filter: [
			'all',
			['<=', 'admin_level', 2],
			['==', '$type', 'LineString'],
			['!has', 'claimed_by']
		],
		layout: {
			'line-cap': 'round',
			'line-join': 'round',
			visibility: 'visible'
		},
		paint: {
			'line-color': 'hsl(0, 0%, 60%)',
			'line-width': {
				base: 1.3,
				stops: [
					[3, 0.5],
					[22, 15]
				]
			}
		}
	},
	{
		id: 'admin_country_z5-',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'boundary',
		minzoom: 5,
		filter: ['all', ['<=', 'admin_level', 2], ['==', '$type', 'LineString']],
		layout: {
			'line-cap': 'round',
			'line-join': 'round',
			visibility: 'visible'
		},
		paint: {
			'line-color': 'hsl(0, 0%, 60%)',
			'line-width': {
				base: 1.3,
				stops: [
					[3, 0.5],
					[22, 15]
				]
			}
		}
	}
];
