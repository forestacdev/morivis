import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'geosphere_lower_austria_geology',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://gis.geosphere.at/maps/rest/services/geologie/nied_200/MapServer/tile/{z}/{y}/{x}'
	},
	metaData: {
		name: 'オーストリア ニーダーエスターライヒ州 地質図（20万分の1）',
		sourceDataName: 'GeoSphere Austria / Geologische Karte von Niederösterreich 1:200.000',
		description:
			'オーストリアのニーダーエスターライヒ州と周辺地域を対象とした20万分の1地質図。岩石・地層の分布や断層などの地質構造を確認するために利用できる。',
		attribution: '© GeoSphere Austria',
		location: '世界',
		tags: ['地質図'],
		minZoom: 4,
		maxZoom: 14,
		tileSize: 256,
		bounds: [14.332393, 46.749651, 17.331995, 48.999514],
		downloadUrl: 'https://gis.geosphere.at/maps/rest/services/geologie/nied_200/MapServer',
		xyzImageTile: { x: 139, y: 89, z: 8 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		legend: {
			type: 'image',
			layout: 'images',
			categories: [{
				name: '提供元の凡例',
				urls: [
					'https://gis.geosphere.at/maps/services/geologie/nied_200/MapServer/WMSServer?SERVICE=WMS&REQUEST=GetLegendGraphic&VERSION=1.3.0&FORMAT=image/png&LAYER=0',
					'https://gis.geosphere.at/maps/services/geologie/nied_200/MapServer/WMSServer?SERVICE=WMS&REQUEST=GetLegendGraphic&VERSION=1.3.0&FORMAT=image/png&LAYER=1'
				],
				labels: ['岩石・地層（ドイツ語）', '地質構造（ドイツ語）']
			}]
		}
	}
};

export default entry;
