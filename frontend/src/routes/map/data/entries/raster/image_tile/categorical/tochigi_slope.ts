import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import { TOCHIGI_BBOX, WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: '',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/slopemap/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '傾斜区分図',
		description:
			'令和３～４年度に栃木県が実施した航空レーザ測量データを使用して作成した「傾斜区分図」です。（引用:G空間情報センター）',
		attribution: '栃木県森林資源データ',
		location: '栃木県',
		tags: ['傾斜区分図'],
		minZoom: 8,
		maxZoom: 15,
		tileSize: 256,
		bounds: TOCHIGI_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/slopemap_tochigi',
		xyzImageTile: {
			x: 3635,
			y: 1597,
			z: 12
		}
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'categorical',
		opacity: 0.8,
		legend: {
			type: 'category',
			name: '傾斜',
			colors: ['#0000FE', '#56FE01', '#FFFF00', '#FE0000'],
			labels: ['0 - 15度', '15.1 - 30度', '30.1 - 35度', '35.1度以上']
		}
	}
};

export default entry;
