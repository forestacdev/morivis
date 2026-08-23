import { OITA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterDemStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'oita_dem',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/dem_143_2025/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '大分県 数値標高データ',
		sourceDataName: 'DEMラスタタイル-PNG標高タイルXYZ',
		description:
			'大分県の標高値をPNG標高タイルで配信したデータ。標高値の参照や地形表現の基盤として利用できる。',
		attribution: '林野庁',
		location: '大分県',
		tags: ['DEM', '地形'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: OITA_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/oita_aerial_laser',
		xyzImageTile: { x: 28340, y: 13002, z: 15 }
	},
	interaction: { clickable: true },
	style: {
		...DEFAULT_RASTER_DEM_STYLE,
		visualization: {
			...DEFAULT_RASTER_DEM_STYLE.visualization,
			demType: 'gsi',
			uniformsData: {
				...DEFAULT_RASTER_DEM_STYLE.visualization.uniformsData,
				relief: { type: 'linear', max: 1500, min: 0, colorMap: 'jet' }
			}
		}
	}
};

export default entry;
