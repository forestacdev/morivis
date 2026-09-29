import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'ign_france_spot_2025',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHO-SAT.SPOT.2025&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM_0_17&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}'
	},
	metaData: {
		name: 'フランス SPOT衛星画像（2025年）',
		sourceDataName: 'IGN ORTHO-SAT SPOT 2025',
		description:
			'2025年に撮影されたSPOT衛星画像を加工した、フランス本土の解像度1.5mのオルソ画像。土地被覆や市街地の確認、背景地図として利用できる。',
		attribution: '© CNES (2025), distribution Airbus DS / IGN・Géoplateforme',
		location: '世界',
		tags: ['写真', '背景地図'],
		minZoom: 0,
		maxZoom: 17,
		tileSize: 256,
		// 配信設定は世界全体の範囲だが、2025年版の対象はフランス本土（コルシカ島を含む）。
		bounds: [-5.5, 41.3, 9.7, 51.2],
		downloadUrl: 'https://cartes.gouv.fr/rechercher-une-donnee/dataset/IGNF_ORTHO-SAT',
		xyzImageTile: { x: 4149, y: 2818, z: 13 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
