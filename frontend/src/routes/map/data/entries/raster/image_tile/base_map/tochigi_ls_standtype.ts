import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import { TOCHIGI_BBOX, WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'tochigi_ls_standtype',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/ls_standtype/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '栃木県 レーザ林相図',
		description:
			'令和３～４年度に栃木県が実施した航空レーザ測量データを使用して作成した「レーザ林相図」です。「レーザ林相図」は、航空レーザ測量で取得した樹冠高や樹冠形状、レーザパルスの反射強度に基づき、樹種や樹冠形状の特徴を図示した画像です。（引用:G空間情報センター）',
		attribution: '栃木県森林資源データ',
		location: '栃木県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		tags: ['森林', '林相図', 'レーザ林相図'],
		bounds: TOCHIGI_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/ls_standtype_tochigi',
		xyzImageTile: {
			x: 3635,
			y: 1597,
			z: 12
		}
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
