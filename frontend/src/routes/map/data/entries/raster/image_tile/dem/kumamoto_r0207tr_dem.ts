import { KUMAMOTO_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterDemStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'kumamoto_r0207tr_dem',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/dem_r0207tr_2025/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '令和2年7月豪雨 数値標高データ',
		sourceDataName: 'DEMラスタタイル-PNG標高タイルXYZ',
		description:
			'令和2年7月豪雨の対象地域の標高値をPNG標高タイルで配信したデータ。標高値の参照や地形表現の基盤として利用できる。',
		attribution: '林野庁',
		location: '熊本県',
		tags: ['DEM', '地形', 'ハザード'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: KUMAMOTO_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/r2_7_gouu',
		xyzImageTile: { x: 14148, y: 6634, z: 14 }
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
