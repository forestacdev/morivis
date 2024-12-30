import type { GeojsonEntry } from '$routes/map/data/types';
import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/map/constants';

const geojsonPolygonEntries = [
	{
		id: 'ENSYURIN_rinhanzu',
		data: {
			name: '演習林林班図',
			dataType: 'geojson',
			geometryType: 'polygon',
			url: `${GEOJSON_BASE_PATH}/ENSYURIN_rinhanzu.geojson`,
			attribution: '森林文化アカデミー',
			location: ['森林文化アカデミー']
		},
		interaction: {
			clickable: true,
			searchKeys: ['小林班ID', '樹種', '林齢']
		},
		style: {
			visible: true,
			opacity: 0.5,
			color: {
				single: '#2a826c',
				expression: [
					{
						key: '樹種',
						type: 'match',
						label: '樹種ごとの色分け',
						mapping: {
							keys: [
								'スギ',
								'ヒノキ',
								'アカマツ',
								'スラッシュマツ',
								'広葉樹',
								'草地',
								'その他岩石'
							],
							values: [
								'#399210',
								'#4ADDA5',
								'#DD2B2B',
								'#B720BF',
								'#EBBC22',
								'#2351E5',
								'#D98F34'
							],
							showIndex: [0, 1, 2, 3, 4, 5, 6]
						}
					}
				]
			},
			numeric: {
				single: 10,
				expression: [
					{
						key: '林齢',
						type: 'interpolate',
						label: '林齢ごとの数値',
						mapping: {
							keys: [0, 30],
							values: [30, 50],
							showIndex: [0, 1]
						}
					}
				]
			},
			layer: {
				fill: {
					paint: {
						'fill-color': '#2a826c'
					},
					layout: {}
				},
				line: {
					paint: {
						'line-color': '#2a826c',
						'line-width': 1,
						'line-dasharray': [1, 0]
					},
					layout: {}
				},
				circle: {
					paint: {
						'circle-radius': 5,
						'circle-stroke-width': 1,
						'circle-color': '#ff0000',
						'circle-stroke-color': '#000000'
					},
					layout: {}
				},
				symbol: {
					paint: {
						'text-halo-color': '#ffffff',
						'text-halo-width': 1,
						'text-size': 12,
						'text-field': '{小林班ID}',
						'icon-image': 'marker-15',
						'icon-size': 1
					},
					layout: {}
				}
			}
		}
	}
];

export { geojsonPolygonEntries };
