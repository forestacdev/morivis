import type { SymbolLayerSpecification, VectorSourceSpecification } from 'maplibre-gl';
import { DEFAULT_SYMBOL_TEXT_FONT } from '$routes/constants';

export const labelSources: Record<string, VectorSourceSpecification> = {
	openmaptiles: {
		type: 'vector',
		url: 'https://tile.openstreetmap.jp/data/planet.json'
	},
	takeshima: {
		type: 'vector',
		url: 'https://tile.openstreetmap.jp/data/takeshima.json'
	},
	hoppo: {
		type: 'vector',
		url: 'https://tile.openstreetmap.jp/data/hoppo.json'
	}
};

export const labelLayers: SymbolLayerSpecification[] = [
	{
		id: 'housenumber',
		type: 'symbol',
		source: 'openmaptiles',
		'source-layer': 'housenumber',
		minzoom: 17,
		filter: ['==', '$type', 'Point'],
		layout: {
			'text-field': '{housenumber}',
			'text-font': DEFAULT_SYMBOL_TEXT_FONT,
			'text-size': 10,
			visibility: 'visible'
		},
		paint: { 'text-color': 'rgba(212, 177, 146, 1)' }
	},
	{
		id: 'poi_label',
		type: 'symbol',
		source: 'openmaptiles',
		'source-layer': 'poi',
		minzoom: 14,
		filter: [
			'all',
			['==', '$type', 'Point'],
			['==', 'rank', 1],
			['!=', 'name', '岐阜県立森林文化アカデミー']
		],
		layout: {
			'icon-size': 1,
			'text-anchor': 'top',
			'text-field': '{name}',
			'text-font': DEFAULT_SYMBOL_TEXT_FONT,
			'text-max-width': 8,
			'text-offset': [0, 0.5],
			'text-size': 11,
			visibility: 'visible'
		},
		paint: {
			'text-color': 'rgba(255, 255, 255, 1)',
			'text-halo-blur': 1,
			'text-halo-color': 'rgba(0, 0, 0, 0.75)',
			'text-halo-width': 1
		}
	},
	{
		id: 'airport-label',
		type: 'symbol',
		source: 'openmaptiles',
		'source-layer': 'aerodrome_label',
		minzoom: 10,
		filter: ['all', ['has', 'iata']],
		layout: {
			'icon-size': 1,
			'text-anchor': 'top',
			'text-field': '{name}',
			'text-font': DEFAULT_SYMBOL_TEXT_FONT,
			'text-max-width': 8,
			'text-offset': [0, 0.5],
			'text-size': 11,
			visibility: 'visible'
		},
		paint: {
			'text-color': 'rgba(255, 255, 255, 1)',
			'text-halo-blur': 1,
			'text-halo-color': 'rgba(0, 0, 0, 0.75)',
			'text-halo-width': 1
		}
	},
	{
		id: 'road_major_label',
		type: 'symbol',
		source: 'openmaptiles',
		'source-layer': 'transportation_name',
		minzoom: 13,
		filter: ['all', ['!=', 'name', '森林文化アカデミー演習林歩道'], ['==', '$type', 'LineString']],
		layout: {
			'symbol-placement': 'line',
			'text-field': '{name}',
			'text-font': DEFAULT_SYMBOL_TEXT_FONT,
			'text-letter-spacing': 0.1,
			'text-rotation-alignment': 'map',
			'text-size': {
				base: 1.4,
				stops: [
					[10, 8],
					[20, 14]
				]
			},
			'text-transform': 'uppercase',
			visibility: 'visible'
		},
		paint: {
			'text-color': 'rgba(255, 255, 255, 1)',
			'text-halo-color': 'rgba(73, 73, 73, 1)',
			'text-halo-width': 2
		}
	},
	{
		id: 'place_label_other',
		type: 'symbol',
		source: 'openmaptiles',
		'source-layer': 'place',
		minzoom: 8,
		filter: [
			'all',
			['==', '$type', 'Point'],
			['!in', 'class', 'city', 'state', 'country', 'continent']
		],
		layout: {
			'text-anchor': 'center',
			'text-field': '{name}',
			'text-font': DEFAULT_SYMBOL_TEXT_FONT,
			'text-max-width': 6,
			'text-size': {
				stops: [
					[6, 10],
					[12, 14]
				]
			},
			visibility: 'visible'
		},
		paint: {
			'text-color': 'rgba(255, 255, 255, 1)',
			'text-halo-blur': 0,
			'text-halo-color': 'rgba(32, 32, 32, 1)',
			'text-halo-width': 2
		}
	},
	{
		id: 'place_label_city',
		type: 'symbol',
		source: 'openmaptiles',
		'source-layer': 'place',
		maxzoom: 16,
		filter: ['all', ['==', '$type', 'Point'], ['==', 'class', 'city']],
		layout: {
			'text-field': '{name:ja}',
			'text-font': DEFAULT_SYMBOL_TEXT_FONT,
			'text-max-width': 10,
			'text-size': {
				stops: [
					[3, 12],
					[8, 16]
				]
			}
		},
		paint: {
			'text-color': 'rgba(255, 255, 255, 1)',
			'text-halo-blur': 0,
			'text-halo-color': 'rgba(0, 0, 0, 0.75)',
			'text-halo-width': 2
		}
	},
	{
		id: 'country_label-other',
		type: 'symbol',
		source: 'openmaptiles',
		'source-layer': 'place',
		maxzoom: 12,
		filter: ['all', ['==', '$type', 'Point'], ['==', 'class', 'country'], ['!has', 'iso_a2']],
		layout: {
			'text-field': '{name}',
			'text-font': DEFAULT_SYMBOL_TEXT_FONT,
			'text-max-width': 10,
			'text-size': {
				stops: [
					[3, 12],
					[8, 22]
				]
			},
			visibility: 'visible'
		},
		paint: {
			'text-color': 'hsl(0, 0%, 13%)',
			'text-halo-blur': 0,
			'text-halo-color': 'rgba(255,255,255,0.75)',
			'text-halo-width': 2
		}
	},
	{
		id: 'country_label',
		type: 'symbol',
		source: 'openmaptiles',
		'source-layer': 'place',
		maxzoom: 12,
		filter: ['all', ['==', '$type', 'Point'], ['==', 'class', 'country'], ['has', 'iso_a2']],
		layout: {
			'text-field': '{name:ja}',
			'text-font': DEFAULT_SYMBOL_TEXT_FONT,
			'text-max-width': 10,
			'text-size': {
				stops: [
					[3, 12],
					[8, 22]
				]
			},
			visibility: 'visible'
		},
		paint: {
			'text-color': 'rgba(255, 255, 255, 1)',
			'text-halo-blur': 0,
			'text-halo-color': 'rgba(0, 0, 0, 0.75)',
			'text-halo-width': 2
		}
	},
	{
		id: 'island-hoppo-name',
		type: 'symbol',
		source: 'hoppo',
		'source-layer': 'island',
		layout: {
			'text-field': '{name}',
			'text-size': {
				stops: [
					[10, 14],
					[15, 24]
				]
			}
		},
		paint: {
			'text-color': '#333',
			'text-halo-color': 'rgba(255, 255, 255, 0.8)',
			'text-halo-width': 1.2
		}
	},
	{
		id: 'island-takeshima-name',
		type: 'symbol',
		source: 'takeshima',
		'source-layer': 'island',
		layout: {
			'text-field': '{name}',
			'text-size': {
				stops: [
					[10, 14],
					[15, 24]
				]
			}
		},
		paint: {
			'text-color': '#333',
			'text-halo-color': 'rgba(255, 255, 255, 0.8)',
			'text-halo-width': 1.2
		}
	},
	{
		id: 'island-takeshima-poi',
		type: 'symbol',
		source: 'takeshima',
		'source-layer': 'island_poi',
		layout: {
			'text-field': '{name}',
			'text-font': DEFAULT_SYMBOL_TEXT_FONT,
			'text-size': {
				stops: [
					[10, 14],
					[15, 24]
				]
			}
		},
		paint: {
			'text-color': '#333',
			'text-halo-color': 'rgba(255, 255, 255, 0.8)',
			'text-halo-width': 1.2
		}
	}
];
