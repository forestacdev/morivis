import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

// 配信仕様・凡例: https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/森林土壌図_土地分類基本調査/MapServer?f=pjson
// 解説・利用条件: https://www.forest.rd.pref.gifu.lg.jp/shiyou/sinrinwebmap.html

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gifu_forest_soil',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/%E6%A3%AE%E6%9E%97%E5%9C%9F%E5%A3%8C%E5%9B%B3_%E5%9C%9F%E5%9C%B0%E5%88%86%E9%A1%9E%E5%9F%BA%E6%9C%AC%E8%AA%BF%E6%9F%BB/MapServer/tile/{z}/{y}/{x}'
	},
	metaData: {
		name: '岐阜県 森林土壌図（土地分類基本調査）',
		sourceDataName: '森林土壌図_土地分類基本調査',
		description:
			'1968〜2007年の土地分類基本調査に基づく岐阜県の山地・丘陵地の土壌を5万分の1相当で表した地図。森林域の土壌の種類と分布を確認するために利用できる。',
		attribution: '岐阜県森林研究所',
		downloadUrl: 'https://www.forest.rd.pref.gifu.lg.jp/shiyou/sinrinwebmap.html',
		location: '岐阜県',
		tags: ['森林', '土壌図'],
		minZoom: 9,
		maxZoom: 15,
		tileSize: 256,
		bounds: [136.2670699, 35.13150571, 137.65423641, 36.46534521],
		xyzImageTile: { x: 14424, y: 6458, z: 14 }
	},
	interaction: { clickable: true },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'nearest',
		// 公式凡例の塗り・線の色を抽出（輪郭と透明背景を除く）。
		// https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/森林土壌図_土地分類基本調査/MapServer/legend?f=pjson
		legend: {
			type: 'category',
			name: '森林土壌区分',
			colors: [
				'#B6B6B6',
				'#FF9999',
				'#E6E6E6',
				'#000099',
				'#660066',
				'#9900CC',
				'#FFCC00',
				'#00CC00',
				'#003300',
				'#CC6600',
				'#FE6600',
				'#FF0000',
				'#000000',
				'#FF00FF',
				'#3399FF',
				'#0066CC',
				'#FDBBB3'
			],
			labels: [
				'RL 岩石地',
				'Im 未熟土',
				'L 岩屑土',
				'Pd 乾性ポドゾル化土壌',
				'Pw 湿性ポドソル化土壌',
				'dB 暗色系褐色森林土',
				'B-d 乾性褐色森林土',
				'B 適潤性褐色森林土',
				'B-w 湿性褐色森林土',
				'gB 表層グライ化褐色森林土',
				'rB 赤色系(黄色系)褐色森林土',
				'R 赤色土',
				'Bl 黒色土',
				'DR 暗赤色土',
				'Pt 泥炭土',
				'Pp 泥炭ポドゾル',
				'Mc 黒泥土'
			]
		}
	}
};

export default entry;
