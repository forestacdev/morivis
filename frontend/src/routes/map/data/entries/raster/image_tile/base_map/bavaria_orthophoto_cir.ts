import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'bavaria_orthophoto_cir',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://wmtsod1.bayernwolke.de/wmts/by_dop_cir/smerc/{z}/{x}/{y}'
	},
	metaData: {
		name: 'ドイツ・バイエルン州 赤外航空写真（CIR・20cm）',
		sourceDataName:
			'Bayerische Vermessungsverwaltung / Luftbild Colorinfrarot Bayern / CIR-DOP20',
		description:
			'バイエルン州の近赤外・赤・緑を使った地上解像度20cmのカラー赤外航空写真で、広域表示では衛星画像に切り替わる。通常の航空写真と見比べて、植生の分布や状態を判読するために利用できる。',
		attribution:
			'© Datenquellen: Bayerische Vermessungsverwaltung, Europäische Union, enthält Copernicus Sentinel-2 Daten 2018, verarbeitet durch das Bundesamt für Kartographie und Geodäsie (BKG)',
		location: '世界',
		tags: ['写真', '森林', '背景地図'],
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
