import type { TileMetaData, VectorEntry } from '$routes/data/types/vector';

const entry: VectorEntry<TileMetaData> = {
	id: 'gsi_road',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'LineString',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '道路',
		description: '国土地理院の道路データ',
		attribution: '国土地理院',
		location: '全国',
		maxZoom: 16,
		minZoom: 4,
		sourceLayer: 'RdCL',
		downloadUrl: 'https://github.com/gsi-cyberjapan/optimal_bvmap'
	},
	properties: {
		keys: ['種類'],
		dict: null,
		titles: null
	},
	interaction: {
		clickable: false
	},
	style: {
		type: 'line',
		opacity: 0.5,
		colors: {
			show: true,
			key: '単色',
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#dedede'
					}
				}
			]
		},
		width: {
			key: '単一',
			expressions: [
				{
					type: 'single',
					key: '単一',
					name: '単一',
					mapping: {
						value: 5
					}
				}
			]
		},
		lineStyle: 'solid',
		labels: {
			key: 'vt_rdctg',
			show: false,
			expressions: [
				{
					key: 'vt_rdctg',
					name: 'vt_rdctg',
					value: '{vt_rdctg}'
				}
			]
		},
		default: {
			symbol: {
				paint: {},
				layout: {
					'text-size': 10,
					'symbol-placement': 'line',
					'symbol-spacing': 100
				}
			}
		}
	}
};

export default entry;
