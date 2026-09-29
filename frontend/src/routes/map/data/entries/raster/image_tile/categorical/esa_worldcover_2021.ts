import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

// WorldCover公式のQGISカラーマップ（https://esa-worldcover.org/en/data-access）。
const LAND_COVER_CATEGORIES = [
	['#006400', '樹木被覆'],
	['#ffbb22', '低木地'],
	['#ffff4c', '草地'],
	['#f096ff', '農地'],
	['#fa0000', '建築物・人工被覆'],
	['#b4b4b4', '裸地・疎らな植生'],
	['#f0f0f0', '雪氷'],
	['#0064c8', '恒常的な水域'],
	['#0096a0', '草本湿地'],
	['#00cf75', 'マングローブ'],
	['#fae6a0', 'コケ・地衣類']
] as const;

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'esa_worldcover_2021',
	type: 'raster',
	format: {
		type: 'image',
		// 現行WMTSはGetTileのTIME指定が必須。
		url: 'https://wmts.terrascope.be/?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=esa-worldcover-map-10m-2021-v2_map&STYLE=default&FORMAT=image/png&TILEMATRIXSET=EPSG:3857&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&TIME=2021-01-01'
	},
	metaData: {
		name: '世界 土地被覆（ESA WorldCover 2021）',
		sourceDataName: 'ESA WorldCover 2021 v200 / Terrascope',
		description:
			'2021年の世界の土地被覆を、10m格子で11種類に分類したデータ。樹木被覆・農地・市街地・水域などの分布を確認するために利用できる。',
		attribution:
			'© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium / CC BY 4.0',
		location: '世界',
		tags: ['土地被覆', '森林', '10m解像度'],
		minZoom: 6,
		maxZoom: 14,
		tileSize: 256,
		bounds: [-180, -60, 180, 83],
		downloadUrl: 'https://esa-worldcover.org/en/data-access',
		xyzImageTile: { x: 898, y: 405, z: 10 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'nearest',
		legend: {
			type: 'category',
			name: '土地被覆',
			colors: LAND_COVER_CATEGORIES.map(([color]) => color),
			labels: LAND_COVER_CATEGORIES.map(([, label]) => label)
		}
	}
};

export default entry;
