import type { RasterEntry } from '$map/data/types/raster';

export const pmtilesRasterEntry: RasterEntry[] = [
	{
		id: 'gifu_sugi_kansetugai',
		type: 'raster',
		format: {
			type: 'pmtiles',
			url: './pmtiles/raster/gifu_sugi_kansetugai.pmtiles'
		},
		metaData: {
			name: 'スギ人工林冠雪害危険度',
			description: '岐阜県スギ人工林冠雪害危険度マップ',
			attribution: '岐阜県森林研究所',
			location: '岐阜県',
			minZoom: 6,
			maxZoom: 10,
			tileSize: 512,
			xyzImageTile: { x: 901, y: 403, z: 10 },
			bounds: [136.1828594, 34.9090933, 137.8301219, 36.7868122],
			legend: {
				name: '20冬期中の危険日判定数',
				colors: ['#FFFFFF', '#FEFEA5', '#FDCDFD', '#FFBE31', '#FC0013', '#6F359C', '#003796'],
				labels: ['0日', '1~2日', '3~5日', '6~10日', '11〜15日', '16~20日', '21日以上']
			}
		},
		interaction: {
			clickable: true,
			overlay: true
		},
		style: {
			type: 'categorical',
			opacity: 0.6,
			hueRotate: 0,
			brightnessMin: 0,
			brightnessMax: 1,
			saturation: 0,
			contrast: 0,
			raster: {
				paint: {},
				layout: {}
			}
		},
		debug: false,
		extension: {}
	}
];
