import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

// IGNの配信凡例の順序・色に対応する32分類。
// https://data.geopf.fr/annexes/ressources/legendes/LANDCOVER.FORESTINVENTORY.V2-legend.png
const FOREST_CATEGORIES = [
	['#e5c45d', '閉鎖林：樹冠被覆なし（伐採・災害後など）'],
	['#008c4d', '閉鎖林：小面積の広葉樹純林'],
	['#004d2e', '閉鎖林：落葉オーク類の純林'],
	['#668040', '閉鎖林：常緑オーク類の純林'],
	['#00ff80', '閉鎖林：ブナの純林'],
	['#40ff1c', '閉鎖林：クリの純林'],
	['#915633', '閉鎖林：ニセアカシアの純林'],
	['#afca59', '閉鎖林：その他の広葉樹の純林'],
	['#00d92f', '閉鎖林：広葉樹混交林'],
	['#8080ff', '閉鎖林：小面積の針葉樹純林'],
	['#bf26ff', '閉鎖林：フランスカイガンショウの純林'],
	['#9926ff', '閉鎖林：ヨーロッパアカマツの純林'],
	['#4d33ff', '閉鎖林：マツ類の純林（pin laricio・pin noir）'],
	['#ff1aff', '閉鎖林：アレッポマツの純林'],
	['#734de6', '閉鎖林：マツ類の純林（pin à crochets・pin cembro）'],
	['#a666ff', '閉鎖林：その他のマツ類の純林'],
	['#d999ff', '閉鎖林：マツ類の混交林'],
	['#1ae6e6', '閉鎖林：モミ類・トウヒ類'],
	['#4d80ff', '閉鎖林：カラマツ類の純林'],
	['#3399ff', '閉鎖林：ダグラスファーの純林'],
	['#00929f', '閉鎖林：その他の針葉樹の混交林'],
	['#59ffff', '閉鎖林：マツ類以外のその他の針葉樹の純林'],
	['#404dff', '閉鎖林：針葉樹混交林'],
	['#ff6633', '閉鎖林：広葉樹優占の針広混交林'],
	['#ff4033', '閉鎖林：針葉樹優占の針広混交林'],
	['#b3b3b3', '疎林：樹冠被覆なし'],
	['#ccffbf', '疎林：広葉樹純林'],
	['#99b3cc', '疎林：針葉樹純林'],
	['#ffd138', '疎林：針広混交林'],
	['#ffff00', 'ポプラ林'],
	['#ffe6bf', '低木地・ヒース（lande）'],
	['#fff9a5', '草本群落']
] as const;

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'ign_france_bd_foret_v2',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=LANDCOVER.FORESTINVENTORY.V2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM_6_16&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}'
	},
	metaData: {
		name: 'フランス 森林分類図（BD Forêt V2）',
		sourceDataName: 'IGN France / BD Forêt V2',
		description:
			'フランス本土の森林を樹種や林相などの区分で表した森林分類図。広葉樹林・針葉樹林・混交林などの分布を確認するために利用できる。',
		attribution: '© IGN France / BD Forêt V2 (Licence Ouverte 2.0)',
		location: '世界',
		tags: ['森林', '植生図', '樹種'],
		minZoom: 6,
		maxZoom: 16,
		tileSize: 256,
		bounds: [-5.15047, 41.3252, 9.57054, 51.0991],
		downloadUrl: 'https://www.data.gouv.fr/datasets/bd-foret-r',
		xyzImageTile: { x: 2078, y: 1417, z: 12 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		legend: {
			type: 'category',
			name: '森林・植生分類（BD Forêt V2）',
			colors: FOREST_CATEGORIES.map(([color]) => color),
			labels: FOREST_CATEGORIES.map(([, label]) => label)
		}
	}
};

export default entry;
