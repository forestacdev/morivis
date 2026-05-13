import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_nendophoto',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/nendophoto{morivis:dimension}/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '年度別空中写真（2007年以降）',
		sourceDataName: '年度別空中写真（2007年以降）',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#seamlessphoto',
		attribution: '国土地理院,GRUS画像（© Axelspace）',
		location: '全国',
		tags: ['写真'],
		minZoom: 14, // 1
		maxZoom: 18,
		tileSize: 256,
		xyzImageTile: IMAGE_TILE_XYZ_SETS['zoom_15'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	state: {
		dimension: {
			currentIndex: 11
		}
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE,
		dimension: {
			type: 'time',
			values: [
				'2007',
				'2008',
				'2009',
				'2010',
				'2011',
				'2012',
				'2013',
				'2014',
				'2015',
				'2016',
				'2017',
				'2018',
				'2019',
				'2020',
				'2021',
				'2022',
				'2023',
				'2024'
			]
		}
	},
	auxiliaryLayers: {
		sources: {
			'gsi_nendophoto:::spec_source': {
				type: 'geojson',
				data: 'https://maps.gsi.go.jp/xyz/nendophoto{morivis:dimension}/2/3/1.geojson'
				// 参考: https://github.com/gsi-cyberjapan/gsimaps
			}
		},
		layers: [
			{
				id: 'gsi_nendophoto:::spec_fill',
				type: 'fill',
				source: 'gsi_nendophoto:::spec_source',
				maxzoom: 14.1,
				minzoom: 2,
				paint: {
					'fill-color': '#f50bde',
					'fill-opacity': 0.5
				}
			},
			{
				id: 'gsi_nendophoto:::spec_label',
				type: 'symbol',
				source: 'gsi_nendophoto:::spec_source',
				maxzoom: 14.1,
				minzoom: 2,
				layout: {
					'text-field': '{撮影年月}撮影',
					'text-size': 10
				},
				paint: {
					'text-color': '#000000',
					'text-halo-color': '#ffffff',
					'text-halo-width': 1
				}
			}
		]
	}
};

export default entry;
