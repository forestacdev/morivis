import type { RasterPMTilesEntry, RasterDemStyle } from '$routes/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/data/style';
import { ENTRY_PMTILES_RASTER_PATH } from '$routes/constants';

const entry: RasterPMTilesEntry<RasterDemStyle> = {
	id: 'ensyurin_dem.pmtiles',
	type: 'raster',
	format: {
		type: 'pmtiles',

		url: `${ENTRY_PMTILES_RASTER_PATH}/ensyurin_dem.pmtiles`
	},
	metaData: {
		name: '演習林 DEM',
		description: '森林文化アカデミーの演習林の標高値を数値化したもの',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 512,
		xyzImageTile: {
			x: 3635,
			y: 1597,
			z: 12
		},
		bounds: [136.91683974376355, 35.540611389073774, 136.9346116207808, 35.55838201305548]
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
