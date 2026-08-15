import { KANAGAWA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterDemStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'kanagawa_dem',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://forestgeo.info/opendata/14_kanagawa/dem_2022/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '神奈川県 数値標高データ',
		sourceDataName: '神奈川県数値標高モデル',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-kanagawa-maptiles2',
		attribution: '神奈川県森林再生課_林野庁加工',
		location: '神奈川県',
		tags: ['DEM', '地形', '0.5m解像度'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: KANAGAWA_BBOX,
		xyzImageTile: { x: 7262, y: 3230, z: 13 }
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
					max: 2000,
					min: 0,
					colorMap: 'jet'
				}
			}
		}
	}
};

export default entry;
