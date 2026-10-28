import { LEGEND_DATA_PATH } from '$routes/constants';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

// 配信仕様・凡例: https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/路網整備難易度W30H30/MapServer?f=pjson
// 解説・利用条件: https://www.forest.rd.pref.gifu.lg.jp/shiyou/sinrinwebmap.html
const IMG = LEGEND_DATA_PATH + '/gifu_road_difficulty_w30_h30';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gifu_road_difficulty_w30_h30',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/%E8%B7%AF%E7%B6%B2%E6%95%B4%E5%82%99%E9%9B%A3%E6%98%93%E5%BA%A6W30H30/MapServer/tile/{z}/{y}/{x}'
	},
	metaData: {
		name: '岐阜県 路網整備難易度推定図（森林作業道・幅員3.0m・切土高3.0m）',
		sourceDataName: '路網整備難易度W30H30',
		description:
			'岐阜県で幅員3.0m・切土高3.0mの森林作業道を作設する際の難易度を5mメッシュで推定した地図。路網整備の候補地と到達可能な範囲を検討するために利用できる。',
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
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'nearest',
		legend: {
			type: 'image',
			categories: [
				{
					'name': '集水面積1ha以上の水系線',
					'urls': [
						IMG + '/0-0.webp'
					],
					'labels': [
						'集水面積1ha以上の水系線'
					]
				},
				{
					'name': '森林作業道(幅員3.0m)到達可能範囲',
					'urls': [
						IMG + '/1-0.webp',
						IMG + '/1-1.webp'
					],
					'labels': [
						'縦断勾配7％以下',
						'縦断勾配18％以下'
					]
				},
				{
					'name': '森林作業道(幅員3.0m)到達困難な作設可能範囲',
					'urls': [
						IMG + '/2-0.webp',
						IMG + '/2-1.webp',
						IMG + '/2-2.webp'
					],
					'labels': [
						'作設困難範囲',
						'縦断勾配7％以下',
						'縦断勾配18％以下'
					]
				}
			]
		}
	}
};

export default entry;
