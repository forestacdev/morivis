import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'swiss_nfi_vegetation_height',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://wmts.geo.admin.ch/1.0.0/ch.bafu.landesforstinventar-vegetationshoehenmodell_sentinel/default/current/3857/{z}/{x}/{y}.png'
	},
	metaData: {
		name: 'スイス 植生高（Sentinel NFI）',
		sourceDataName: 'BAFU / WSL / Vegetation Height Model Sentinel NFI',
		description:
			'Sentinel-2衛星画像などから推定した、スイスの植生高を10m格子で表すデータ。配信中の最新年の植生の高さを確認するために利用できる。',
		attribution:
			'© BAFU / WSL, Landesforstinventar (LFI) / Contains modified Copernicus Sentinel data',
		location: '世界',
		tags: ['森林', '植生図'],
		minZoom: 0,
		maxZoom: 18,
		tileSize: 256,
		bounds: [5.140242, 45.398181, 11.47757, 48.230651],
		downloadUrl: 'https://opendata.swiss/en/dataset/vegetationshohenmodell-sentinel-lfi',
		xyzImageTile: { x: 2136, y: 1441, z: 12 }
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
					'https://api3.geo.admin.ch/static/images/legends/ch.bafu.landesforstinventar-vegetationshoehenmodell_sentinel_de.png'
				],
				labels: ['植生高（m・ドイツ語）']
			}]
		}
	}
};

export default entry;
