import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

// 配信仕様・凡例: https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/傾斜平面曲率図/MapServer?f=pjson
// 解説・利用条件: https://www.forest.rd.pref.gifu.lg.jp/shiyou/sinrinwebmap.html

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gifu_slope_plan_curvature',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/%E5%82%BE%E6%96%9C%E5%B9%B3%E9%9D%A2%E6%9B%B2%E7%8E%87%E5%9B%B3/MapServer/tile/{z}/{y}/{x}'
	},
	metaData: {
		name: '岐阜県 傾斜平面曲率図',
		sourceDataName: '傾斜平面曲率図',
		description:
			'岐阜県の傾斜角度と平面曲率による地形の凹凸を色分けした地図。森林作業道の路線検討時に斜面の傾きと凹凸を確認するために利用できる。',
		attribution: '岐阜県森林研究所',
		downloadUrl: 'https://www.forest.rd.pref.gifu.lg.jp/shiyou/sinrinwebmap.html',
		location: '岐阜県',
		tags: ['森林', '地形', '曲率'],
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
		// 公式凡例の塗り・線の色を抽出（輪郭と透明背景を除く）。
		// https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/傾斜平面曲率図/MapServer/legend?f=pjson
		legend: {
			type: 'category',
			name: '傾斜角度・平面曲率',
			colors: [
				'#A2E4E6',
				'#95FB0F',
				'#FAE500',
				'#33672C',
				'#FD1A1C',
				'#D26600',
				'#54015A'
			],
			labels: [
				'傾斜20度未満',
				'傾斜20度以上30度未満かつ凸地形',
				'傾斜30度以上35度未満かつ凸地形',
				'傾斜20度以上30度未満かつ凹地形',
				'傾斜35度以上かつ凸地形',
				'傾斜30度以上35度未満かつ凹地形',
				'傾斜35度以上かつ凹地形'
			]
		}
	}
};

export default entry;
