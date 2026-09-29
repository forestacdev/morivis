import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'ign_france_bd_foret_v2',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=LANDCOVER.FORESTINVENTORY.V2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM_6_16&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}'
	},
	metaData: {
		name: 'フランス 森林分類図（BD Forêt V2）',
		sourceDataName: 'IGN France / BD Forêt V2',
		description:
			'フランス本土の森林を樹種や林相などの区分で表した森林分類図。広葉樹林・針葉樹林・混交林などの分布を確認するために利用できる。',
		attribution: '© IGN France / BD Forêt V2 (Licence Ouverte 2.0)',
		location: '世界',
		tags: ['森林', '植生図', '樹種'],
		minZoom: 6,
		maxZoom: 16,
		tileSize: 256,
		bounds: [-5.15047, 41.3252, 9.57054, 51.0991],
		downloadUrl: 'https://www.data.gouv.fr/datasets/bd-foret-r',
		xyzImageTile: { x: 2078, y: 1417, z: 12 }
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
					'https://data.geopf.fr/annexes/ressources/legendes/LANDCOVER.FORESTINVENTORY.V2-legend.png'
				],
				labels: ['森林分類（フランス語）']
			}]
		}
	}
};

export default entry;
