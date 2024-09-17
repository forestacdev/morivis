import type { GeojsonEntry } from '$lib/data/types';
import { GEOJSON_BASE_PATH } from '$lib/constants';

export const geojsonLabelEntries: GeojsonEntry<'label'>[] = [
	{
		id: 'TITEN',
		name: 'その他ポイント',
		dataType: 'geojson',
		geometryType: 'label',
		opacity: 1,
		url: `${GEOJSON_BASE_PATH}/TITEN.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		clickable: true,
		location: ['森林文化アカデミー'],
		searchKeys: ['name'],
		styleKey: 'デフォルト',
		style: {
			symbol: [
				{
					name: 'デフォルト',
					layout: {
						visibility: 'visible',
						'text-field': ['to-string', ['get', 'name']],
						'text-size': 14,
						'text-offset': [0, -1],
						'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
						'text-radial-offset': 0.5,
						'text-justify': 'auto',
						'icon-image': ['to-string', ['get', 'image']],
						'icon-size': 1
					},
					paint: {
						'text-halo-color': '#000000',
						'text-halo-width': 2,
						'text-opacity': 1,
						'text-color': '#99B8FF'
					}
				}
			]
		}
	}
];
