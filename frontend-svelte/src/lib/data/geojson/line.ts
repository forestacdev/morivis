import type { GeojsonEntry } from '$lib/data/types';
import { GEOJSON_BASE_PATH } from '$lib/constants';

export const geojsonLineEntries: GeojsonEntry<'line'>[] = [
	{
		id: 'ENSYURIN_MITI',
		name: '演習林道',
		dataType: 'geojson',
		geometryType: 'line',
		opacity: 1,
		url: `${GEOJSON_BASE_PATH}/ENSYURIN_MITI.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		clickable: true,
		location: ['森林文化アカデミー'],
		style_key: '単色',
		style: {
			line: [
				{
					name: 'デフォルト',
					layout: {
						'line-cap': 'square',
						'line-join': 'round'
					},
					paint: {
						'line-color': 'rgba(255, 255, 255, 1)',
						'line-width': {
							stops: [
								[15, 1.5],
								[17, 4]
							]
						}
					}
				}
			]
		}
	}
];
