import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/style';
import { TOCHIGI_BBOX } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'tochigi_dem',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.gsj.jp/tiles/elev/tochigi/{z}/{y}/{x}.png'
	},
	metaData: {
		name: '栃木県 数値標高データ',
		description: `
栃木県のGeoTiff標高データを投影法変換してズームレベル18のタイルを作成し、順次低ズームレベルのタイルセットを生成。低解像度化の際は4ピクセル中の北西（左上）ピクセル値を採用。全国Q地図タイルを加工したもの。`,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/dem05_tochigi',
		attribution: '栃木県森林資源データ',
		location: '栃木県',
		tags: ['DEM', '地形', '0.5m解像度'],
		minZoom: 2,
		maxZoom: 18,
		tileSize: 256,
		xyzImageTile: {
			x: 3635,
			y: 1597,
			z: 12
		},
		bounds: TOCHIGI_BBOX
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_DEM_STYLE,
		visualization: {
			...DEFAULT_RASTER_DEM_STYLE.visualization,
			demType: 'gsi'
		}
	}
};

export default entry;
