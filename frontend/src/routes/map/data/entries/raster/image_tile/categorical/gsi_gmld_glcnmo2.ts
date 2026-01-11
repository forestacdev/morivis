import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/meta_data/bounds';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/style';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gsi_gmld_glcnmo2',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/gmld_glcnmo2/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '土地被覆（GLCNMO）',
		attribution: '国土地理院',
		description: '© 国土地理院・千葉大学・協働機関',
		location: '世界',
		tags: ['土地被覆'],
		minZoom: 0,
		maxZoom: 7,
		tileSize: 256,
		bounds: WEB_MERCATOR_WORLD_BBOX,
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#glcnmo2',
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_0
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'nearest',
		legend: {
			type: 'category',
			name: '分類',
			colors: [
				'#004600', // 常緑広葉樹林 (Broadleaf Evergreen Forest)
				'#55AA00', // 落葉広葉樹林 (Broadleaf Deciduous Forest)
				'#009600', // 常用針葉樹林 (Needleleaf Evergreen Forest)
				'#6E8C28', // 落葉針葉樹林 (Needleleaf Deciduous Forest)
				'#00FF00', // 混合樹林 (Mixed Forest)
				'#9BC09B', // 疎林 (Tree Open)
				'#598259', // かん木 (Shrub)
				'#AAFF00', // 草地 (Herbaceous)
				'#B4D79E', // まばらな木またはかん木を含む草地 (Herbaceous with Sparse Tree/Shrub)
				'#FFFF64', // まばらな植生 (Sparse vegetation)
				'#FF9B00', // 畑 (Cropland)
				'#9B00FF', // 水田 (Paddy field)
				'#FF6EFF', // 農地と他の植生の混合 (Cropland/Other Vegetation Mosaic)
				'#8282FF', // マングローブ (Mangrove)
				'#A5F5F5', // 湿地 (Wetland)
				'#696969', // 裸地（礫、岩） (Bare area, consolidated)
				'#C8C8C8', // 裸地（砂） (Bare area, unconsolidated)
				'#FF0000', // 市街地 (Urban)
				'#FAFAFA', // 雪氷 (Snow/Ice)
				'#00C8FF' // 水部 (Water bodies)
			],
			labels: [
				'常緑広葉樹林',
				'落葉広葉樹林',
				'常用針葉樹林',
				'落葉針葉樹林',
				'混合樹林',
				'疎林',
				'かん木',
				'草地',
				'まばらな木またはかん木を含む草地',
				'まばらな植生',
				'畑',
				'水田',
				'農地と他の植生の混合',
				'マングローブ',
				'湿地',
				'裸地（礫、岩）',
				'裸地（砂）',
				'市街地',
				'雪氷',
				'水部'
			]
		}
	}
};

export default entry;
