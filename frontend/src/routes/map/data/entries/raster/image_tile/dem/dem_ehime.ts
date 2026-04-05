import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';
import { EHIME_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dem_ehime',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://forestgeo.info/opendata/38_ehime/dem_2019/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '愛媛県 数値標高データ',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-ehime-maptiles',
		attribution: '愛媛県林業政策課_林野庁加工',
		tags: ['DEM', '地形', '0.5m解像度'],
		location: '愛媛県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: EHIME_BBOX,
		xyzImageTile: { x: 7130, y: 3275, z: 13 }
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
					max: 2000,
					min: 0,
					colorMap: 'jet'
				}
			}
		}
	}
};

export default entry;
