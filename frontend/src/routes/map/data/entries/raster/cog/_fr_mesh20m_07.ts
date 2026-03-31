import { ENTRY_COG_DATA_PATH } from '$routes/constants';
import type { RasterCogEntry, RasterTiffStyle } from '$routes/map/data/types/raster';

const entry: RasterCogEntry<RasterTiffStyle> = {
	id: 'fr_mesh20m_07',
	type: 'raster',
	format: {
		type: 'cog',
		url: `${ENTRY_COG_DATA_PATH}/fr_mesh20m_07.tif`
	},
	metaData: {
		name: '森林資源メッシュ20m　7系',
		description: '',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		tileSize: 256,
		tags: ['メッシュ', '地形'],
		maxZoom: 22,
		minZoom: 1,
		bounds: [136.22291427, 34.57011925, 137.8613532, 37.85670754],
		xyzImageTile: { x: 901, y: 401, z: 10 }
	},
	interaction: {
		clickable: false
	},
	style: {
		type: 'tiff',
		opacity: 1.0,
		resampling: 'nearest',
		visualization: {
			numBands: 9,
			mode: 'single',
			uniformsData: {
				single: {
					index: 0,
					min: 0,
					max: 104,
					colorMap: 'jet'
				},
				multi: {
					r: {
						index: 0,
						min: 0,
						max: 104
					},
					g: {
						index: 1,
						min: 0,
						max: 28
					},
					b: {
						index: 2,
						min: 0,
						max: 104
					}
				}
			}
		}
	}
};

export default entry;
