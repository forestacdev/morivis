import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'kochi_fr_mesh20m',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://rinya-kochi.geospatial.jp/2023/rinya/tile/fr_mesh20m/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '森林資源量集計メッシュ',
		description: `平成30年度に林野庁が実施した航空レーザ測量データを基に、高知県が作成した「森林資源量集計メッシュ」です。
「森林資源量集計メッシュ」は、森林GISフォーラムが運用する”森林資源データ解析・管理標準仕様書ver.2.0”に則し作成したデータで、20mメッシュ単位で次に記載する森林資源量を集計しています。（G空間情報センター引用）`,
		attribution: '高知県森林資源データ',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/fr_mesh20m_kochi',
		location: '高知県',
		tags: ['森林', 'メッシュ'],
		minZoom: 13,
		maxZoom: 16,
		sourceLayer: 'fr_mesh20m_kochi',
		bounds: [132.479888, 32.702505, 134.31367, 33.882997],
		xyzImageTile: { x: 57075, y: 26263, z: 16 },
		center: [133.49424, 33.636878]
	},
	properties: {
		keys: [
			'面積_ha',
			'立木本数',
			'立木密度',
			'合計材積',
			'ha材積',
			'収量比数',
			'相対幹距比',
			'平均傾斜',
			'最大傾斜',
			'最小傾斜',
			'最頻傾斜',
			'県code',
			'市町村code'
		],
		titles: [
			{
				conditions: ['樹種'],
				template: '{樹種}'
			},
			{
				conditions: [],
				template: '高知県の森林資源メッシュ'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'fill',
		opacity: 0.7,
		colors: {
			key: '単色',
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
					type: 'step',
					key: '立木本数',
					name: '立木本数による色分け',
					mapping: {
						range: [1, 100],
						divisions: 5,
						values: ['#e6f2ff', '#ff00dd']
					}
				}
			]
		},
		outline: {
			show: true,
			color: '#5f5f5f',
			width: 0.5,
			lineStyle: 'solid'
		},
		labels: {
			key: '樹種',
			show: false,
			expressions: [
				{
					key: '面積_ha',
					name: '面積_ha',
					value: '{面積_ha}'
				},
				{
					key: '立木本数',
					name: '立木本数',
					value: '{立木本数}'
				},
				{
					key: '立木密度',
					name: '立木密度',
					value: '{立木密度}'
				},
				{
					key: '合計材積',
					name: '合計材積',
					value: '{合計材積}'
				},
				{
					key: 'ha材積',
					name: 'ha材積',
					value: '{ha材積}'
				},
				{
					key: '収量比数',
					name: '収量比数',
					value: '{収量比数}'
				},
				{
					key: '相対幹距比',
					name: '相対幹距比',
					value: '{相対幹距比}'
				},
				{
					key: '平均傾斜',
					name: '平均傾斜',
					value: '{平均傾斜}'
				},
				{
					key: '最大傾斜',
					name: '最大傾斜',
					value: '{最大傾斜}'
				},
				{
					key: '最小傾斜',
					name: '最小傾斜',
					value: '{最小傾斜}'
				},
				{
					key: '最頻傾斜',
					name: '最頻傾斜',
					value: '{最頻傾斜}'
				},
				{
					key: '県code',
					name: '県code',
					value: '{県code}'
				},
				{
					key: '市町村code',
					name: '市町村code',
					value: '{市町村code}'
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
