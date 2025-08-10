import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/style';
import { YAMANASHI_BBOX } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dem_yamanashi',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://forestgeo.info/opendata/19_yamanashi/dem_terrainRGB_2024/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '山梨県 数値標高データ',
		sourceDataName: '山梨県数値標高モデル',
		description: '',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-yamanashi-maptiles',
		attribution: '林野庁',
		location: '山梨県',
		tags: ['DEM', '地形', '0.5m解像度'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: YAMANASHI_BBOX,
		xyzImageTile: { x: 14486, y: 6449, z: 14 }
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_DEM_STYLE,
		visualization: {
			...DEFAULT_RASTER_DEM_STYLE.visualization,
			demType: 'mapbox'
		}
	}
};

export default entry;
