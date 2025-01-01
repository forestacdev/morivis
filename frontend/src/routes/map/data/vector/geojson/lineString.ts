import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/map/constants';
import type { GeoJsonEntry } from '$routes/map/data/vector';

export const geoJsonLineStringEntry: GeoJsonEntry = {
	ENSYURIN_MITI: {
		type: 'vector',
		format: {
			type: 'geojson',
			geometryType: 'LineString',
			url: `${GEOJSON_BASE_PATH}/ENSYURIN_MITI.geojson`
		},
		metaData: {
			name: '演習林道',
			description: '演習林の道データです。',
			attribution: '森林文化アカデミー',
			location: '森林文化アカデミー',
			minZoom: 13,
			maxZoom: 18,
			bounds: null
		},
		properties: {
			keys: ['種類'],
			dict: null
		},
		interaction: {
			// インタラクションの設定
			clickable: true, // クリック可能かどうか
			searchKeys: []
		},
		style: {
			type: 'line',
			opacity: 1, // 透過率
			color: '#2a826c', // 塗りつぶしの色
			displayLabel: false,
			labels: [],
			expressions: {
				color: [
					{
						type: 'match',
						key: '種類',
						name: '道の種類ごと',
						mapping: {
							categories: ['林道', '歩道']
						}
					}
				],
				number: [
					{
						type: 'match',
						key: '',
						name: '種類',
						mapping: {
							categories: ['林道', '歩道'],
							values: [10, 5]
						}
					}
				]
			},
			default: {
				line: {
					paint: {
						'line-width': 2
					},
					layout: {}
				},
				circle: {
					paint: {
						'circle-radius': 5,
						'circle-stroke-width': 1,
						'circle-stroke-color': '#000000'
					},
					layout: {}
				},
				symbol: {
					paint: {},
					layout: {}
				}
			}
		}
	}
};
