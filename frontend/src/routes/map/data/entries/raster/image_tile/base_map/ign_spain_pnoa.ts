import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'ign_spain_pnoa',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://www.ign.es/wmts/pnoa-ma?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=OI.OrthoimageCoverage&STYLE=default&FORMAT=image/jpeg&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}'
	},
	metaData: {
		name: 'スペイン PNOA航空写真・Sentinel-2衛星画像',
		sourceDataName: 'IGN España / PNOA máxima actualidad / Copernicus Sentinel-2',
		description:
			'Sentinel-2衛星画像とPNOAの最新オルソ画像を組み合わせた、スペインの画像配信。広域では衛星画像、拡大時には主に航空写真で土地被覆や建物を確認できる。',
		attribution:
			'© IGN España・Sistema Cartográfico Nacional / PNOA・Copernicus Sentinel-2 (CC BY 4.0); Melilla: Pléiades Neo © Airbus DS (2022)',
		location: '世界',
		tags: ['写真', '背景地図'],
		minZoom: 0,
		maxZoom: 19,
		tileSize: 256,
		// 同じレイヤーのWMS GetCapabilitiesが示す範囲（カナリア諸島などを含む）。
		bounds: [-19, 27, 5, 44],
		downloadUrl: 'https://pnt.ign.es/visualizadores-y-servicios-web',
		xyzImageTile: { x: 4011, y: 3088, z: 13 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
