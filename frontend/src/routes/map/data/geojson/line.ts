import type { GeojsonEntry } from '$routes/map/data/types';
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
		clickable: false,
		location: ['森林文化アカデミー'],
		styleKey: '単色',
		style: {
			line: [
				{
					name: '単色',
					paint: {
						'line-color': '#ffffff',
						'line-width': {
							stops: [
								[15, 1.5],
								[17, 4]
							]
						}
					},
					layout: {
						'line-cap': 'square',
						'line-join': 'round'
					}
				}
			]
		}
	}
];
