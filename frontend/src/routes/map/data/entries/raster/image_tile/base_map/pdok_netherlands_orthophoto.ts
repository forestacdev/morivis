import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'pdok_netherlands_orthophoto',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg'
	},
	metaData: {
		name: 'オランダ 航空写真（PDOK・8cm）',
		sourceDataName: 'PDOK / Beeldmateriaal Nederland / Actueel Ortho HR RGB',
		description:
			'PDOKが配信する、最新年次のオランダのカラー航空写真。建物・道路・森林などの地表の様子を確認するために利用できる。',
		attribution: 'PDOK / Beeldmateriaal Nederland',
		location: '世界',
		tags: ['写真', '背景地図'],
		minZoom: 0,
		maxZoom: 21,
		tileSize: 256,
		bounds: [-1.657292, 48.040502, 12.431727, 56.11059],
		downloadUrl: 'https://www.pdok.nl/ogc-webservices/-/article/pdok-luchtfoto-rgb-open-',
		xyzImageTile: { x: 16830, y: 10768, z: 15 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
