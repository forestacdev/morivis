import { LEGEND_DATA_PATH } from '$routes/constants';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

// 配信仕様・凡例: https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/路網整備難易度W30H20/MapServer?f=pjson
// W25H20の切土高は県公式WMTS一覧の2.0mを採用（ArcGISアイテム説明の3.0m表記とは不一致）。
// 解説・利用条件: https://www.forest.rd.pref.gifu.lg.jp/shiyou/sinrinwebmap.html
const IMG = LEGEND_DATA_PATH + '/gifu_road_difficulty';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gifu_road_difficulty',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/%E8%B7%AF%E7%B6%B2%E6%95%B4%E5%82%99%E9%9B%A3%E6%98%93%E5%BA%A6{morivis:dimension}/MapServer/tile/{z}/{y}/{x}'
	},
	metaData: {
		name: '岐阜県 路網整備難易度推定図',
		sourceDataName: '路網整備難易度推定図（幅員・切土高別の6種類）',
		description:
			'岐阜県の林業専用道・森林作業道の整備難易度を幅員と切土高の条件別に5mメッシュで推定した地図。条件を切り替え、路網整備の候補地と到達可能な範囲を検討するために利用できる。',
		attribution: '岐阜県森林研究所',
		downloadUrl: 'https://www.forest.rd.pref.gifu.lg.jp/shiyou/sinrinwebmap.html',
		location: '岐阜県',
		tags: ['森林', '林道', '5m解像度'],
		minZoom: 0,
		maxZoom: 17,
		tileSize: 256,
		bounds: [136.26566107, 35.13370768, 137.66514312, 36.47448313],
		xyzImageTile: { x: 14424, y: 6458, z: 14 }
	},
	interaction: { clickable: false },
	state: { dimension: { currentIndex: 2 } },
	properties: {
		temporal: {
			dimension: {
				type: 'variant',
				values: [
					'W25H20',
					'W25H30',
					'W30H20',
					'W30H30',
					'W36H20',
					'W36H30'
				],
				labels: [
					'森林作業道：幅員2.5m・切土高2.0m',
					'森林作業道：幅員2.5m・切土高3.0m',
					'森林作業道：幅員3.0m・切土高2.0m',
					'森林作業道：幅員3.0m・切土高3.0m',
					'林業専用道：幅員3.6m・切土高2.0m',
					'林業専用道：幅員3.6m・切土高3.0m'
				],
				placeholder: '幅員・切土高を選択'
			}
		}
	},
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'nearest',
		legend: {
			type: 'image',
			categories: [
				{
					name: '集水面積1ha以上の水系線',
					urls: [
						IMG + '/0-0.webp'
					],
					labels: [
						'集水面積1ha以上の水系線'
					]
				},
				{
					name: '到達可能範囲',
					urls: [
						IMG + '/1-0.webp',
						IMG + '/1-1.webp'
					],
					labels: [
						'縦断勾配7％以下',
						'縦断勾配18％以下（幅員3.6mでは12％以下）'
					]
				},
				{
					name: '到達困難な作設可能範囲',
					urls: [
						IMG + '/2-0.webp',
						IMG + '/2-1.webp',
						IMG + '/2-2.webp'
					],
					labels: [
						'作設困難範囲',
						'縦断勾配7％以下',
						'縦断勾配18％以下（幅員3.6mでは12％以下）'
					]
				}
			]
		}
	}
};

export default entry;
