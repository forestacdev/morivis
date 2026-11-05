import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import { FFPRI_SOIL_LEGENDS } from '$routes/map/data/entries/_meta_data/ffpri-soil-legends';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const aggregateLegend = FFPRI_SOIL_LEGENDS.CF30;
const depthLegend = FFPRI_SOIL_LEGENDS.CF;

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'ffpri_soilmap_cf',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://www2.ffpri.go.jp/soilmap/tile/sp/{morivis:dimension}/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '土壌特性値 石レキ率',
		description:
			'全国の森林域における、深さ別の土壌石レキ率の推定値を表した配信地図。深さ0–30cm、0–5cm、5–15cm、15–30cmを切り替え、石レキの含有割合の分布の把握に利用できる。',
		sourceDataName: '森林土壌デジタルマップ・石レキ率',
		attribution: '森林総研・森林土壌デジタルマップ',
		location: '全国',
		tags: ['森林', '土壌'],
		minZoom: 1,
		maxZoom: 15,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		downloadUrl: 'https://www2.ffpri.go.jp/soilmap/data-src.html',
		xyzImageTile: { x: 450, y: 200, z: 9 }
	},
	interaction: { clickable: false },
	state: { dimension: { currentIndex: 0 } },
	properties: {
		temporal: {
			dimension: {
				type: 'variant',
				values: ['CF30', 'CF_0_5', 'CF_5_15', 'CF_15_30'],
				labels: ['深さ 0–30cm', '深さ 0–5cm', '深さ 5–15cm', '深さ 15–30cm'],
				placeholder: '深さを選択'
			}
		}
	},
	style: {
		type: 'categorical',
		resampling: 'nearest',
		opacity: 0.7,
		legend: aggregateLegend,
		legendByDimension: {
			CF30: aggregateLegend,
			CF_0_5: depthLegend,
			CF_5_15: depthLegend,
			CF_15_30: depthLegend
		}
	}
};

export default entry;
