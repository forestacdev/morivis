import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import type { RasterImageEntry, RasterCategoricalStyle } from '$routes/map/data/types/raster';

const NDVI_TIME_VALUES = (() => {
	const values: string[] = [];

	for (let year = 2012; year >= 2004; year -= 1) {
		const startMonth = year === 2004 ? 4 : 1;

		for (let month = 12; month >= startMonth; month -= 1) {
			values.push(`_${year}_${String(month).padStart(2, '0')}`);
		}
	}

	return values;
})();

const NDVI_TIME_LABELS = NDVI_TIME_VALUES.map((value) => {
	const match = value.match(/^_(\d{4})_(\d{2})$/);
	if (!match) return value;

	return `${Number(match[1])}年${Number(match[2])}月`;
});

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gsi_ndvi_250m',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/ndvi_250m{morivis:dimension}/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '植生指標データ 250m',
		sourceDataName: '全国植生指標データ（250m）',
		downloadUrl: 'https://www.gsi.go.jp/kankyochiri/ndvi-Modis_download.html',
		attribution: '国土地理院',
		location: '全国',
		tags: ['植生図'],
		minZoom: 2,
		maxZoom: 10,
		tileSize: 256,
		xyzImageTile: {
			x: 224,
			y: 101,
			z: 8
		},
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		description:
			'250m植生指標データを色分けして表現した地図。植生の量や季節変化を月ごとに確認する際に利用できる。'
	},
	interaction: {
		clickable: true
	},
	state: {
		dimension: {
			currentIndex: NDVI_TIME_VALUES.length - 1
		}
	},
	style: {
		type: 'categorical',
		resampling: 'nearest',
		opacity: 0.7,
		dimension: {
			type: 'time',
			values: NDVI_TIME_VALUES,
			labels: NDVI_TIME_LABELS
		},
		legend: {
			type: 'gradient',
			name: '植生指標',
			colors: ['#FF0000', '#DD2611', '#FFFF00', '#007F00'],
			ranges: [1, 200],
			unit: ''
		}
	}
};

export default entry;
