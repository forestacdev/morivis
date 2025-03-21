import type { RasterEntry } from '$routes/data/types/raster';

export const cogEntry: RasterEntry[] = [
	{
		id: 'cog_test',
		type: 'raster',
		format: {
			type: 'cog',
			url: './cog/cog.tif'
		},
		metaData: {
			name: 'cog',
			description: 'cog',
			attribution: '国土地理院',
			location: '美濃市',
			minZoom: 1,
			maxZoom: 18,
			tileSize: 256,
			xyzImageTile: null,
			bounds: null,
			legend: null
		},
		interaction: {
			clickable: false,
			overlay: false
		},
		style: {
			type: 'dem',
			opacity: 1.0,
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
	}
];
