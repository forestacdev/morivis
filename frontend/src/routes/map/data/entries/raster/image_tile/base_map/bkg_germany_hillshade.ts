import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'bkg_germany_hillshade',
	type: 'raster',
	format: {
		type: 'image',
		// GLOBAL_WEBMERCATORはXYZと同じ格子。配信URLの並びはz/y/x。
		url: 'https://sgx.geodatenzentrum.de/wmts_basemapde_schummerung/tile/1.0.0/de_basemapde_web_raster_hillshade/default/GLOBAL_WEBMERCATOR/{z}/{y}/{x}.png'
	},
	metaData: {
		name: 'ドイツ 地形陰影図（basemap.de）',
		sourceDataName: 'GeoBasis-DE / BKG / basemap.de Web Raster Hillshade',
		description:
			'ドイツ全国の5m格子の標高データを基に、地形の起伏を陰影で表現した地図。山地や谷、平野の地形を確認する際の背景として利用できる。',
		attribution:
			'© GeoBasis-DE / <a href="https://www.bkg.bund.de">BKG</a> (2026) <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>',
		location: '世界',
		tags: ['地形', '背景地図'],
		minZoom: 0,
		maxZoom: 19,
		tileSize: 256,
		// WMTS GetCapabilitiesのWGS84BoundingBox。
		bounds: [0.10594674240568917, 45.2375427360256, 20.448891294525627, 56.84787345153813],
		downloadUrl: 'https://basemap.de/produkte-und-dienste/web-raster-schummerung/',
		xyzImageTile: { x: 2177, y: 1430, z: 12 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
