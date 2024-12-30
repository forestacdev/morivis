import type { LayerEntry, GeojsonEntry } from '$routes/map/data/types';
import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/map/constants';

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
		searchKeys: ['name'],
		style: {
			circle: {
				show: true,
				styleKey: '単色',
				color: {
					['単色']: {
						type: 'single',
						property: '',
						values: {
							default: '#ff0000'
						}
					},
					['サインポールの種類ごとの色分け']: (() => {
						const categories = {
							ポール1: '#00ff00',
							ポール2: '#ff00ff',
							ポール3: '#ffff00',
							ポール4: '#00ffff',
							ポール5: '#ff0000',
							ポール6: '#0000ff',
							ポール7: '#ff8000'
						};
						return {
							type: 'match',
							property: '名前',
							values: {
								categories,
								default: '#00000000',
								showCategories: Object.keys(categories)
							}
						};
					})()
				},
				circleRadius: {
					type: 'デフォルト',
					values: {
						['デフォルト']: 10,
						custom: 5
					}
				},
				strokeColor: {
					type: 'デフォルト',
					values: {
						['デフォルト']: '#ffffff',
						custom: '#000000'
					}
				},
				strokeWidth: {
					type: 'デフォルト',
					values: {
						['デフォルト']: 10,
						custom: 5
					}
				},
				paint: {
					'circle-radius': 10,
					'circle-stroke-width': 1
				}
			}
		}
	}
];
