import { ENTRY_TIFF_DATA_PATH } from '$routes/constants';
import type { RasterImageEntry, RasterTiffStyle } from '$routes/data/types/raster';

const entry: RasterImageEntry<RasterTiffStyle> = {
	id: 'ensyurin_dem_tiff',
	type: 'raster',
	format: {
		type: 'image',
		url: `${ENTRY_TIFF_DATA_PATH}/ensyurin_dem.tif`
	},
	metaData: {
		name: '演習林 標高図',
		description: '',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		tileSize: 256,
		maxZoom: 22,
		minZoom: 1,
		bounds: [136.91683974376355, 35.540611389073774, 136.9346116207808, 35.55838201305548]
	},
	interaction: {
		clickable: false
	},
	style: {
		type: 'tiff',
		opacity: 1.0,
		visualization: {
			numBands: 1,
			mode: 'single',
			uniformsData: {
				single: {
					index: 0,
					min: 80,
					max: 424,
					colorMap: 'jet'
				},
				multi: {
					r: {
						index: 0,
						min: 0,
						max: 255
					},
					g: {
						index: 0,
						min: 0,
						max: 255
					},
					b: {
						index: 0,
						min: 0,
						max: 255
					}
				}
			}
		}
	}
};

export default entry;
