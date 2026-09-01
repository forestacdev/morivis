import { ISHIKAWA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterDemStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'noto_r06eq_dem',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/dem_r06eq_2025/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '令和6年能登半島地震 数値標高データ',
		sourceDataName: 'DEMラスタタイル-PNG標高タイルXYZ',
		description:
			'令和6年能登半島地震の対象地域の標高値をPNG標高タイルで配信したデータ。標高値の参照や地形表現の基盤として利用できる。',
		attribution: '林野庁',
		location: '石川県',
		tags: ['DEM', '地形', '地震'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: ISHIKAWA_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/r6_noto-peninsula-earthquake',
		xyzImageTile: { x: 28866, y: 12698, z: 15 }
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
