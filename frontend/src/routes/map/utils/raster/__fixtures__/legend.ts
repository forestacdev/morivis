import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

export const createLegendEntry = (): RasterImageEntry<RasterCategoricalStyle> => ({
	id: 'test-dimension-legend',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.example.test/{morivis:dimension}/{z}/{x}/{y}.png'
	},
	metaData: {
		name: 'test-layer',
		attribution: 'test-provider',
		tags: [],
		location: 'その他',
		minZoom: 0,
		maxZoom: 5,
		tileSize: 256,
		bounds: [0, 0, 1, 1],
		xyzImageTile: { x: 0, y: 0, z: 0 }
	},
	interaction: { clickable: false },
	state: { dimension: { currentIndex: 0 } },
	properties: {
		temporal: {
			dimension: {
				type: 'variant',
				values: ['test-image', 'test-gradient', 'test-category', 'test-unmapped']
			}
		}
	},
	style: {
		type: 'categorical',
		opacity: 1,
		legend: {
			type: 'category',
			name: 'test-default',
			colors: ['#000000'],
			labels: ['test-default']
		},
		legendByDimension: {
			'test-image': {
				type: 'image',
				categories: [{
					name: 'test-image',
					urls: ['https://assets.example.test/test-legend.webp'],
					labels: ['test-image']
				}]
			},
			'test-gradient': {
				type: 'gradient',
				name: 'test-gradient',
				colors: ['#112233', '#445566'],
				ranges: [0, 8],
				unit: 'test-unit'
			},
			'test-category': {
				type: 'category',
				name: 'test-category',
				colors: ['#123456'],
				labels: ['test-class']
			}
		}
	}
});
