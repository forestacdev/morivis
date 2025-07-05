import type { RasterPMTilesEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/style';
import { ENTRY_PMTILES_RASTER_PATH, IMAGE_TILE_XYZ_SETS } from '$routes/constants';

const entry: RasterPMTilesEntry<RasterDemStyle> = {
	id: 'twi_ooita',
	type: 'raster',
	format: {
		type: 'pmtiles',

		url: `${ENTRY_PMTILES_RASTER_PATH}/twi_ooita.pmtiles`
	},
	metaData: {
		name: '福岡県 地形湿潤指標',
		description: '福岡県の地形湿潤指標（TWI）の10mメッシュデータ',
		attribution: '森林総合研究所',
		location: '福岡県',
		tags: ['地形', 'TWI'],
		minZoom: 8,
		maxZoom: 13,
		tileSize: 256,
		downloadUrl: `https://www.ffpri.affrc.go.jp/labs/GGSILV/TWI.html`, // ダウンロード用のURL
		xyzImageTile: {
			x: 1771,
			y: 824,
			z: 11
		}, // 画像タイルのXYZ座標
		bounds: [130.8244139036812328, 32.7147781331445557, 132.0853865969756384, 33.7401721950509739]
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_DEM_STYLE,
		visualization: {
			...DEFAULT_RASTER_DEM_STYLE.visualization,
			demType: 'mapbox',
			mode: 'relief',
			uniformsData: {
				...DEFAULT_RASTER_DEM_STYLE.visualization.uniformsData,

				relief: {
					max: 29,
					min: 0,
					colorMap: 'hsv'
				}
			}
		}
	}
};

export default entry;
