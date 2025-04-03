import type { VectorEntry, TileMetaData } from '$routes/data/types/vector/index';
// import { COVER_IMAGE_BASE_PATH } from '$routes/constants';

export const pmtilesPointEntry: VectorEntry<TileMetaData>[] = [
	{
		id: 'tokyo_gairoju',
		type: 'vector',
		format: {
			type: 'pmtiles',
			geometryType: 'Point',
			url: './pmtiles/vector/tokyo_gairoju.pmtiles'
		},
		metaData: {
			name: '東京都23区 街路樹',
			description: `このデータは、以下の著作物を改変して利用しています。
                            【ライセンスされている著作物のタイトル】、東京都・【その他の著作権者】、クリエイティブ・コモンズ・ライセンス 表示4.0国際（https://creativecommons.org/licenses/by/4.0/deed.ja）`,
			attribution: '東京都オープンデータカタログサイト',
			downloadUrl: 'https://catalog.data.metro.tokyo.lg.jp/dataset/t000014d2000000029',
			location: '東京都',
			minZoom: 0,
			maxZoom: 14,
			sourceLayer: 'tokyo_gairoju',
			bounds: [139.5658198, 35.5473344, 139.9092201, 35.8170772],
			coverImage: null
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
					template: '街路樹'
				}
			]
		},
		interaction: {
			clickable: true
		},
		style: {
			type: 'circle',
			opacity: 0.5,
			markerType: 'circle',
			colors: {
				key: '単色',
				show: true,
				expressions: [
					{
						type: 'single',
						key: '単色',
						name: '単色',
						mapping: {
							value: '#009405'
						}
					}
				]
			},
			radius: {
				key: '単一',
				expressions: [
					{
						type: 'single',
						key: '単一',
						name: '単一',
						mapping: {
							value: 8
						}
					}
				]
			},
			outline: {
				show: true,
				color: '#000000',
				width: 2
			},
			labels: {
				key: '樹種',
				show: true,
				expressions: [
					{
						key: '樹種',
						name: '樹種',
						value: '{樹種}'
					}
				]
			},
			default: {
				circle: {
					paint: {},
					layout: {}
				},
				symbol: {
					paint: {},
					layout: {}
				}
			}
		}
	}
];
