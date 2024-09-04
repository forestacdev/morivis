import type { LayerEntry, GeojsonEntry } from '$lib/data/types';
import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$lib/constants';

export const geojsonPointEntries: GeojsonEntry<'point'>[] = [
	{
		id: 'ENSYURIN_pole',
		name: 'サインポール',
		dataType: 'geojson',
		geometryType: 'point',
		opacity: 0.7,
		url: `${GEOJSON_BASE_PATH}/ENSYURIN_pole.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		clickable: true,
		location: ['森林文化アカデミー'],
		styleKey: 'デフォルト',
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
