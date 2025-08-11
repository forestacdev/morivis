import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/style';
import { NIIGATA_NAGAOKA_BBOX } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dchm_niigata_nagaoka',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://forestgeo.info/opendata/15_niigata/nagaoka/dchm_2024/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '長岡市 数値樹冠高データ',
		sourceDataName: '林野庁・数値樹冠高モデルDCHM0.5m（長岡地域2024）',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-dchm-nagaoka2024',
		attribution: '林野庁',
		tags: ['森林', 'DCHM', '樹冠高', '0.5m解像度'],
		location: '新潟県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		xyzImageTile: { x: 116178, y: 50794, z: 17 }, // 画像タイルのXYZ座標
		bounds: NIIGATA_NAGAOKA_BBOX
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
					max: 45,
					min: 0,
					colorMap: 'jet'
				}
			}
		}
	}
};

export default entry;
