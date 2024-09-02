import type { LayerEntry } from '$lib/data/types';
import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$lib/constants';

export const pointEntries: LayerEntry[] = [
	{
		id: 'ENSYURIN_pole',
		name: 'サインポール',
		type: 'geojson-point',
		opacity: 0.7,
		path: `${GEOJSON_BASE_PATH}/ENSYURIN_pole.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		clickable: true,
		style_key: 'デフォルト',
		style: {
			circle: [
				{
					name: 'デフォルト',
					paint: {
						'circle-color': '#ff0000',
						'circle-radius': 10,
						'circle-stroke-width': 1
					}
				}
			]
		}
	}
];
