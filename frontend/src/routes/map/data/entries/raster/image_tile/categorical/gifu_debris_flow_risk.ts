import { LEGEND_DATA_PATH } from '$routes/constants';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

// 配信仕様・凡例: https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/土石流災害リスク評価図/MapServer?f=pjson
// 解説・利用条件: https://www.forest.rd.pref.gifu.lg.jp/shiyou/sinrinwebmap.html

const IMG = LEGEND_DATA_PATH + '/gifu_debris_flow_risk';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gifu_debris_flow_risk',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/%E5%9C%9F%E7%9F%B3%E6%B5%81%E7%81%BD%E5%AE%B3%E3%83%AA%E3%82%B9%E3%82%AF%E8%A9%95%E4%BE%A1%E5%9B%B3/MapServer/tile/{z}/{y}/{x}'
	},
	metaData: {
		name: '岐阜県 土石流災害リスク評価支援図',
		sourceDataName: '土石流災害リスク評価支援図',
		description:
			'岐阜県の渓流の縦断勾配と林地から建物までの距離を表した地図。森林管理や路網整備の検討時に土石流災害リスクに関係する条件を確認するために利用できる。',
		attribution: '岐阜県森林研究所',
		downloadUrl: 'https://www.forest.rd.pref.gifu.lg.jp/shiyou/sinrinwebmap.html',
		location: '岐阜県',
		tags: ['森林', '林道', '土石流', '土砂災害'],
		minZoom: 0,
		maxZoom: 17,
		tileSize: 256,
		bounds: [136.2657741, 35.13142026, 137.6650349, 36.47435696],
		xyzImageTile: { x: 14424, y: 6458, z: 14 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'nearest',
		// https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/土石流災害リスク評価図/MapServer/legend?f=pjson
		legend: {
			type: 'image',
			categories: [
				{
					name: '建物',
					urls: [
						IMG + '/0-0.webp'
					],
					labels: [
						'建物'
					]
				},
				{
					name: '水系線（集水面積1ha以上）の縦断勾配',
					urls: [
						IMG + '/1-0.webp',
						IMG + '/1-1.webp',
						IMG + '/1-2.webp'
					],
					labels: [
						'2度以下',
						'8度以下',
						'8度超'
					]
				},
				{
					name: '建物までの距離',
					urls: [
						IMG + '/2-0.webp',
						IMG + '/2-1.webp',
						IMG + '/2-2.webp'
					],
					labels: [
						'1km以下',
						'2km以下',
						'2km超'
					]
				}
			]
		}
	}
};

export default entry;
