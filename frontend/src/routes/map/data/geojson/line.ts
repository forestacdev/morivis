import type { GeojsonEntry } from '$routes/map/data/types';
import { GEOJSON_BASE_PATH } from '$routes/map/constants';

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
		style: {
			line: {
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
					['道の種類ごとの色分け']: (() => {
						const categories = {
							林道: '#00ff00'
						};
						return {
							type: 'match',
							property: '種類',
							values: {
								categories,
								default: '#00bfff',
								showCategories: Object.keys(categories) // 動的に生成
							}
						};
					})()
				},
				linePattern: 'solid',
				lineWidth: {
					type: 'default',
					values: {
						default: ['match', ['get', '種類'], ['林道'], 10, 5],
						custom: 2
					}
				},
				paint: {},
				layout: {
					'line-cap': 'square',
					'line-join': 'round'
				}
			}
		}
	}
];
