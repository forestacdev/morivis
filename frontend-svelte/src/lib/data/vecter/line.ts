import type { LayerEntry } from '$lib/data/types';
import { GEOJSON_BASE_PATH } from '$lib/constants';

export const lineEntries: LayerEntry[] = [
	{
		id: 'ENSYURIN_MITI',
		name: '演習林道',
		type: 'geojson-line',
		opacity: 1,
		path: `${GEOJSON_BASE_PATH}/ENSYURIN_MITI.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		clickable: true,
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
