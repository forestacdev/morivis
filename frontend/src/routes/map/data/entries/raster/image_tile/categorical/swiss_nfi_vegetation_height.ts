import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

// 提供元の凡例に合わせた植生高の区分と色。
// https://api3.geo.admin.ch/static/images/legends/ch.bafu.landesforstinventar-vegetationshoehenmodell_sentinel_de.png
const VEGETATION_HEIGHT_CATEGORIES = [
	['#ffffff', '0–1 m'],
	['#ffffab', '1–2 m'],
	['#ffff57', '2–3 m'],
	['#ecfc00', '3–5 m'],
	['#abf500', '5–15 m'],
	['#66eb00', '15–20 m'],
	['#00c91e', '20–30 m'],
	['#009e8c', '30–40 m'],
	['#00695c', '40–65 m']
] as const;

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
			type: 'category',
			name: '植生高（m）',
			colors: VEGETATION_HEIGHT_CATEGORIES.map(([color]) => color),
			labels: VEGETATION_HEIGHT_CATEGORIES.map(([, label]) => label)
		}
	}
};

export default entry;
