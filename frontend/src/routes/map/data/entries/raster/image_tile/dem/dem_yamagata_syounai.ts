import { YAMAGATA_SYOUNAI_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterDemStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dem_yamagata_syounai',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/dem_028_2025/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '庄内森林計画区 数値標高データ',
		sourceDataName: 'DEMラスタタイル-PNG標高タイルXYZ',
		description:
			'庄内森林計画区の標高値をPNG標高タイルで配信したデータ。標高値の参照や地形表現の基盤として利用できる。',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/028_syounai',
		attribution: '山形県_林野庁加工',
		location: '山形県',
		tags: ['DEM', '地形'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: YAMAGATA_SYOUNAI_BBOX,
		xyzImageTile: { x: 14549, y: 6280, z: 14 }
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
					type: 'linear',
					max: 1500,
					min: 0,
					colorMap: 'jet'
				}
			}
		}
	}
};

export default entry;
