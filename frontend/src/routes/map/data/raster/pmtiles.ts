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
			xyzImageTile: { x: 901, y: 403, z: 10 },
			bounds: [136.1828594, 34.9090933, 137.8301219, 36.7868122]
		},
		interaction: {
			clickable: false,
			overlay: false,
			legend: null
		},
		style: {
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
