import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'swisstopo_swissalti3d_hillshade',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissalti3d-reliefschattierung/default/current/3857/{z}/{x}/{y}.png'
	},
	metaData: {
		name: 'スイス 地形陰影図（swissALTI3D）',
		sourceDataName: 'swisstopo swissALTI3D multidirectional hillshade',
		description:
			'swissALTI3Dの標高モデルから複数方向の光源で作成した、スイスとリヒテンシュタインの地形陰影図。尾根や谷などの地形を判読する際の背景として利用できる。',
		attribution: '© swisstopo',
		location: '世界',
		tags: ['地形', '背景地図'],
		minZoom: 0,
		maxZoom: 18,
		tileSize: 256,
		bounds: [5.140242, 45.398181, 11.47757, 48.230651],
		downloadUrl: 'https://map.geo.admin.ch/?layers=ch.swisstopo.swissalti3d-reliefschattierung',
		xyzImageTile: { x: 132, y: 90, z: 8 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
