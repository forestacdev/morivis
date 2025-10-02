import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/style';
import { KANAGAWA_BBOX } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dsm_kanagawa',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://forestgeo.info/opendata/14_kanagawa/dsm_terrainRGB_2022/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '神奈川県 数値表層データ',
		sourceDataName: '神奈川県数値表層モデル',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-kanagawa-maptiles2',
		attribution: '神奈川県森林再生課（林野庁加工）',
		location: '神奈川県',
		tags: ['DSM', '地形', '0.5m解像度'],
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
			demType: 'mapbox',
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
