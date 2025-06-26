import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/data/style';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'ehime_ls_standtype',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-ehime.geospatial.jp/tile/rinya/2024/ls_standtype_Ehime/{z}/{x}/{-y}.png'
	},
	metaData: {
		name: '愛媛県 レーザ林相図',
		description: `
			平成30年度に林野庁が実施した航空レーザ測量データを基に、愛媛県が作成した「レーザ林相図」です。「レーザ林相図」は、航空レーザ測量で取得した樹冠高や樹冠形状、レーザパルスの反射強度に基づき、樹種や樹冠形状の特徴を図示した画像です。
             （G空間情報センター引用）`,
		attribution: '愛媛県森林資源データ',
		location: '愛媛県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/ls_standtype_ehime',
		xyzImageTile: {
			x: 227730,
			y: 157017,
			z: 18
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
