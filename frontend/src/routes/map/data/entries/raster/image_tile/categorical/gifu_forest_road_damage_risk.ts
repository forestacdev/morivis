import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

// 配信仕様・凡例: https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/森林作業道損壊発生リスク評価支援図/MapServer?f=pjson
// 解説・利用条件: https://www.forest.rd.pref.gifu.lg.jp/shiyou/sinrinwebmap.html

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gifu_forest_road_damage_risk',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/%E6%A3%AE%E6%9E%97%E4%BD%9C%E6%A5%AD%E9%81%93%E6%90%8D%E5%A3%8A%E7%99%BA%E7%94%9F%E3%83%AA%E3%82%B9%E3%82%AF%E8%A9%95%E4%BE%A1%E6%94%AF%E6%8F%B4%E5%9B%B3/MapServer/tile/{z}/{y}/{x}'
	},
	metaData: {
		name: '岐阜県 森林作業道損壊発生リスク評価支援図',
		sourceDataName: '森林作業道損壊発生リスク評価支援図',
		description:
			'岐阜県の傾斜35度以上の斜面を凸地形と凹地形に分けて示した地図。森林作業道の路線検討時に損壊リスクに関係する地形を確認するために利用できる。',
		attribution: '岐阜県森林研究所',
		downloadUrl: 'https://www.forest.rd.pref.gifu.lg.jp/shiyou/sinrinwebmap.html',
		location: '岐阜県',
		tags: ['森林', '林道', '地形', '土砂災害'],
		minZoom: 8,
		maxZoom: 17,
		tileSize: 256,
		bounds: [136.25194785, 35.12818957, 137.66226631, 36.4685003],
		xyzImageTile: { x: 14424, y: 6458, z: 14 }
	},
	interaction: { clickable: true },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'nearest',
		// 透明な「傾斜35度未満」は色判定に含めない。透明画素は既存の取得処理で対象外になる。
		// 公式凡例の塗り・線の色を抽出（輪郭と透明背景を除く）。
		// https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/森林作業道損壊発生リスク評価支援図/MapServer/legend?f=pjson
		legend: {
			type: 'category',
			name: '傾斜35度以上の地形',
			colors: [
				'#FD1A1C',
				'#54015A'
			],
			labels: [
				'傾斜35度以上かつ凸地形',
				'傾斜35度以上かつ凹地形'
			]
		}
	}
};

export default entry;
