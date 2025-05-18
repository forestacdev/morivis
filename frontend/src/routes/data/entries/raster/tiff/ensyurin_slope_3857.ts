import { ENTRY_TIFF_DATA_PATH } from '$routes/constants';
import type { RasterTiffEntry } from '$routes/data/types/raster';

const entry: RasterTiffEntry = {
	id: 'ensyurin_slope_3857',
	type: 'raster',
	format: {
		type: 'tiff',
		url: `${ENTRY_TIFF_DATA_PATH}/ensyurin_slope_3857.tif`
	},
	metaData: {
		name: '演習林傾斜量図',
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
			mode: 'single',
			uniformsData: {
				single: {
					min: 0,
					max: 79.4177017211914,
					colorMap: 'greys'
				},
				multi: {
					bands: [
						{ index: 0, min: 0, max: 255 }, // R
						{ index: 1, min: 0, max: 255 }, // G
						{ index: 2, min: 0, max: 255 } // B
					],
					colorSpace: 'rgb'
				}
			}
		}
	}
};

export default entry;
