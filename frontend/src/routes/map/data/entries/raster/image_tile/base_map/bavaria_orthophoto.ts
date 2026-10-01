import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'bavaria_orthophoto',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://wmtsod1.bayernwolke.de/wmts/by_dop/smerc/{z}/{x}/{y}'
	},
	metaData: {
		name: 'ドイツ・バイエルン州 航空写真（20cm）',
		sourceDataName: 'Bayerische Vermessungsverwaltung / Luftbild Bayern / DOP20',
		description:
			'バイエルン州の地上解像度20cmの航空写真を配信するレイヤーで、広域表示では衛星画像に切り替わる。森林や農地、市街地の状況を確認する際の背景として利用できる。',
		// WMTS利用案内の航空写真レイヤーの指定表記。低ズームの衛星画像の出典も含む。
		attribution:
			'© Datenquellen: Bayerische Vermessungsverwaltung, Europäische Union, enthält Copernicus Sentinel-2 Daten 2018, verarbeitet durch das Bundesamt für Kartographie und Geodäsie (BKG)',
		location: '世界',
		tags: ['写真', '背景地図'],
		minZoom: 0,
		maxZoom: 19,
		tileSize: 256,
		bounds: [8.945107890491915, 47.248466288051446, 13.90891310401004, 50.57987000589413],
		downloadUrl: 'https://www.ldbv.bayern.de/produkte/karten/wmtsgeobasisdaten.html',
		xyzImageTile: { x: 2177, y: 1430, z: 12 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
