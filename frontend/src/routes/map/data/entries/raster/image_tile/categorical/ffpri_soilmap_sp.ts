import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'ffpri_soilmap_sp',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://www2.ffpri.go.jp/soilmap/tile/sp/{morivis:dimension}/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '森林土壌 炭素蓄積量',
		description: '全国の森林域における土壌有機炭素蓄積量の推定値',
		sourceDataName: '炭素蓄積量',
		attribution: '森林総研・森林土壌デジタルマップ',
		location: '全国',
		tags: ['森林', '土壌'],
		minZoom: 1,
		maxZoom: 15,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		downloadUrl: 'https://www2.ffpri.go.jp/soilmap/data-src3.html',
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_9
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'categorical',
		opacity: 0.7,
		dimension: {
			type: 'variant',
			values: ['OCS30', 'OCS_0_5', 'OCS_5_15', 'OCS_15_30'],
			labels: ['深さ 0-30cm', '深さ 0-5cm', '深さ 5-15cm', '深さ 15-30cm'],
			currentIndex: 0,
			placeholder: '深さを選択'
		},
		legend: {
			type: 'gradient',
			name: '炭素蓄積量',
			colors: [
				'#d53e4f',
				'#f46d43',
				'#fdae61',
				'#fee08b',
				'#ffffbf',
				'#e6f598',
				'#abdda4',
				'#66c2a5',
				'#3288bd'
			],
			ranges: [20, 140],
			unit: 'tC/ha'
		}
	}
};

export default entry;
