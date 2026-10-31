import { LEGEND_DATA_PATH } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import type {
	ImageLegend,
	RasterCategoricalStyle,
	RasterImageEntry
} from '$routes/map/data/types/raster';

const IMG = LEGEND_DATA_PATH + '/ffpri_soilmap_sp';

const aggregateLegend: ImageLegend = {
	type: 'image',
	categories: [{
		name: '有機炭素蓄積量（tC/ha）',
		urls: [`${IMG}/OCS30.webp`],
		labels: ['深さ 0–30cm：20–140 tC/ha']
	}]
};

const depthLegend: ImageLegend = {
	type: 'image',
	categories: [{
		name: '有機炭素蓄積量（tC/ha）',
		urls: [`${IMG}/OCS.webp`],
		labels: ['深さ 0–5cm・5–15cm・15–30cm：10–40 tC/ha']
	}]
};

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'ffpri_soilmap_sp',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://www2.ffpri.go.jp/soilmap/tile/sp/{morivis:dimension}/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '土壌特性値 炭素蓄積量',
		description:
			'全国の森林域における、深さ別の土壌有機炭素蓄積量の推定値を表した配信地図。深さ0–30cm、0–5cm、5–15cm、15–30cmを切り替え、炭素の蓄積状況の把握に利用できる。',
		sourceDataName: '森林土壌デジタルマップ・有機炭素蓄積量',
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
				values: ['OCS30', 'OCS_0_5', 'OCS_5_15', 'OCS_15_30'],
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
			OCS30: aggregateLegend,
			OCS_0_5: depthLegend,
			OCS_5_15: depthLegend,
			OCS_15_30: depthLegend
		}
	}
};

export default entry;
