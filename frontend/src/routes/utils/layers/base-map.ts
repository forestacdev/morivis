import type { RasterLayerSpecification, RasterSourceSpecification } from 'maplibre-gl';

export const BaseMapStyleJson = {
	sources: {
		base_usgs_imagery_only: {
			type: 'raster',
			tiles: [
				'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'
			],
			minZoom: 1,
			maxZoom: 22,
			tileSize: 256,
			attribution: 'USGS'
		} as RasterSourceSpecification,
		base_seamlessphoto: {
			type: 'raster',
			tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
			tileSize: 256,
			minZoom: 1,
			maxZoom: 18,
			bounds: [122.933755, 24.045713, 153.986895, 45.556277],
			attribution: '国土地理院'
		} as RasterSourceSpecification,
		base_rinya_m: {
			type: 'raster',
			tiles: ['https://cyberjapandata.gsi.go.jp/xyz/rinya_m/{z}/{x}/{y}.png'],
			tileSize: 256,
			minZoom: 14,
			maxZoom: 18,
			bounds: [122.933755, 24.045713, 153.986895, 45.556277],
			attribution: '国土地理院'
		} as RasterSourceSpecification
	},
	layers: [
		{
			id: 'base-map-layer',
			type: 'raster',
			source: 'base_usgs_imagery_only',
			minzoom: 1,
			maxzoom: 8.5,
			paint: {
				'raster-opacity': [
					'interpolate',
					['linear'],
					['zoom'],
					1,
					1, // ズーム1-7で完全に表示
					7,
					1,
					8,
					0.7, // ズーム8で70%
					8.5,
					0.3, // ズーム8.5で30%
					9,
					0, // ズーム9で完全に透明
					19,
					0 // ズーム19まで透明を維持
				]
			}
		} as RasterLayerSpecification,
		{
			id: 'base_seamlessphoto_layer',
			type: 'raster',
			source: 'base_seamlessphoto',
			minzoom: 8,
			maxzoom: 19,
			paint: {
				'raster-opacity': [
					'interpolate',
					['linear'],
					['zoom'],
					1,
					0, // ズーム1-7で完全に透明
					7,
					0,
					8,
					0.3, // ズーム8で30%
					8.5,
					0.7, // ズーム8.5で70%
					9,
					1, // ズーム9で完全に表示
					19,
					1 // ズーム19まで表示を維持
				]
			}
		} as RasterLayerSpecification
	]
};
