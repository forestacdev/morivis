import type { RasterImageEntry, RasterDemStyle } from '../../types/raster';

export const imageTileDemEntry: RasterImageEntry<RasterDemStyle>[] = [
	{
		id: 'dem_5a',
		type: 'raster',
		format: {
			type: 'image',
			url: 'https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png'
		},
		metaData: {
			name: '基盤地図情報数値標高モデル DEM5A',
			description: '',
			downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#dem',
			attribution: '国土地理院',
			location: '全国',
			minZoom: 1,
			maxZoom: 15,
			tileSize: 256,
			xyzImageTile: null,
			bounds: [122.935, 20.425, 153.986, 45.551],
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
	}
];
