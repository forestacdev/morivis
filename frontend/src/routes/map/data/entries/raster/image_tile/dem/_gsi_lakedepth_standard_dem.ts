import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'gsi_lakedepth_standard_dem',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/lakedepth_standard/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '基準水面標データ',
		description: '',
		sourceDataName: '基準水面標高タイル',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#lakedepth_standard',
		attribution: '国土地理院',
		tags: ['地形'],
		location: '全国',
		minZoom: 1,
		maxZoom: 14,
		tileSize: 256,
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_7, // 画像タイルのXYZ座標
		bounds: WEB_MERCATOR_JAPAN_BOUNDS
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_DEM_STYLE,
		visualization: {
			...DEFAULT_RASTER_DEM_STYLE.visualization,
			demType: 'gsi',
			uniformsData: {
				...DEFAULT_RASTER_DEM_STYLE.visualization.uniformsData,
				relief: {
					max: 1000,
					min: -1000,
					colorMap: 'jet'
				}
			}
		}
	}
};

export default entry;
