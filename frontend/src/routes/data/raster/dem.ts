import type { RasterImageEntry, RasterDemStyle } from '../types/raster';

export const imageTileDemEntry: RasterImageEntry<RasterDemStyle> = {
	id: 'dem_png',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '傾斜区分図',
		description: '岐阜県の傾斜区分図',
		downloadUrl: 'https://www.forest.rd.pref.gifu.lg.jp/shiyou/sinrinwebmap.html',
		attribution: '岐阜県森林研究所',
		location: '岐阜県',
		minZoom: 1,
		maxZoom: 18,
		tileSize: 256,
		xyzImageTile: null,
		bounds: [136.1828594, 34.9090933, 137.8301219, 36.7868122],
		coverImage: null
	},
	interaction: {
		clickable: true,
		overlay: true
	},
	style: {
		type: 'dem',
		opacity: 1.0,
		visualization: {
			demType: 'gsi',
			mode: 'evolution',
			uniformsData: {
				shadow: {
					azimuth: 180,
					altitude: 45
				},
				slope: {
					colorMap: 'salinity'
				},
				evolution: {
					max: 1000,
					min: 0,
					colorMap: 'earth'
				},
				aspect: {
					colorMap: 'rainbowSoft'
				},
				curvature: {
					ridgeThreshold: 0.7,
					valleyThreshold: 0.3,
					ridgeColor: '#980707',
					valleyColor: '#137c83'
				}
			}
		},
		raster: {
			paint: {},
			layout: {}
		}
	}
};
