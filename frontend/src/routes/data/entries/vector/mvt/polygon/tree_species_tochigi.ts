import type { VectorEntry, TileMetaData } from '$routes/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'tree_species_tochigi',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/tree_species/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '樹種ポリゴン',
		description: `出典：栃木県森林資源データ`,
		attribution: '林野庁',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/tree_species_tochigi',
		location: '栃木県',
		minZoom: 8,
		maxZoom: 18,
		sourceLayer: 'tree_species_tochigi',
		bounds: [139.326731, 36.199924, 140.291983, 37.155039]
	},
	properties: {
		keys: [],
		dict: null,
		titles: [
			{
				conditions: ['樹種'],
				template: '{樹種}'
			},
			{
				conditions: [],
				template: '栃木県の樹種ポリゴン'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'fill',
		opacity: 0.5,
		colors: {
			key: '解析樹種ID',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#349f1c'
					}
				},
				{
					type: 'match',
					key: '解析樹種ID',
					name: '樹種ごとの色分け',
					mapping: {
						categories: [
							'01',
							'02',
							'03',
							'04',
							'05',
							'06',
							'07',
							'08',
							'09',
							'10',
							'11',
							'12',
							'96',
							'97',
							'98',
							'99'
						],
						values: [
							'#00cc66',
							'#99ff66',
							'#cc0000',
							'#ff9966',
							'#ffcc99',
							'#cc6600',
							'#cc00cc',
							'#ffff99',
							'#ff9933',
							'#cc9900',
							'#ffff00',
							'#8000ff',
							'#8db3e2',
							'#ccff99',
							'#ff80ff',
							'#bfbfbf'
						]
					}
				}
			]
		},
		outline: {
			show: false,
			color: '#000000',
			width: 2,
			lineStyle: 'dashed'
		},
		labels: {
			key: '樹種',
			show: false,
			expressions: [
				{
					key: '樹種',
					name: '樹種',
					value: '{樹種}'
				}
			]
		},
		default: {
			symbol: {
				paint: {
					'text-color': '#000000',
					'text-halo-color': '#FFFFFF',
					'text-halo-width': 1,
					'text-opacity': 1
				},
				layout: {
					'text-field': ['to-string', ['get', '樹種']],
					'text-max-width': 12,
					'text-size': 12,
					'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
					'text-radial-offset': 0.5,
					'text-justify': 'auto'
				}
			}
		}
	}
};

export default entry;
