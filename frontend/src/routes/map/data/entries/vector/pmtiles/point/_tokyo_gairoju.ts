import { ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'tokyo_gairoju',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Point',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/tokyo_gairoju.pmtiles`
	},
	metaData: {
		name: '東京都23区 街路樹',
		description: `✅
            本データは「東京都オープンデータカタログサイト」（https://catalog.data.metro.tokyo.lg.jp/）において公開されているデータをもとに作成しています。
            データセット名：「都道の街路樹」
            データ提供元：東京都
            ライセンス：東京都オープンデータ利用規約（https://portal.data.metro.tokyo.lg.jp/terms/）`,
		attribution: '東京都オープンデータカタログサイト',
		downloadUrl: 'https://catalog.data.metro.tokyo.lg.jp/dataset/t000014d2000000029',
		location: '東京都',
		minZoom: 1,
		maxZoom: 14,
		sourceLayer: 'tokyo_gairoju',
		bounds: [139.5658198, 35.5473344, 139.9092201, 35.8170772]
	},
	properties: {
		keys: [],
		titles: [
			{
				conditions: ['樹種'],
				template: '{樹種}'
			},
			{
				conditions: [],
				template: '東京都23区 街路樹'
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
			color: '#FFFFFF',
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
		}
	}
};

export default entry;
