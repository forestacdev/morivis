import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import legend from './_legends/swisstopo_geology_500';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'swisstopo_geology_500',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.geologie-geologische_karte/default/current/3857/{z}/{x}/{y}.png'
	},
	metaData: {
		name: 'スイス 地質図（50万分の1）',
		sourceDataName: 'swisstopo GeoMaps 500 / Geological map of Switzerland',
		description:
			'スイスと周辺地域の地質を50万分の1で表した地質図。岩石や地層の分布を広域で確認するために利用できる。',
		attribution: '© swisstopo',
		location: '世界',
		tags: ['地質図'],
		minZoom: 0,
		maxZoom: 18,
		tileSize: 256,
		bounds: [5.140242, 45.398181, 11.47757, 48.230651],
		downloadUrl: 'https://www.swisstopo.admin.ch/en/geomaps-500-pixel',
		xyzImageTile: { x: 132, y: 90, z: 8 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		legend
	}
};

export default entry;
