import type { RasterLayerSpecification, RasterSourceSpecification } from 'maplibre-gl';

export const BaseMapStyleJson = {
	sources: {
		base_usgs_imagery_only: {
			type: 'raster',
			tiles: [
				'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'
			],
			tileSize: 256,
			maxZoom: 10,
			attribution: 'USGS'
		} as RasterSourceSpecification,
		base_seamlessphoto: {
			type: 'raster',
			tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
			tileSize: 256,
			minZoom: 1,
			maxzoom: 18,
			bounds: [122.933755, 24.045713, 153.986895, 45.556277],
			attribution: '国土地理院'
		} as RasterSourceSpecification
		// base_rinya_m: {
		// 	type: 'raster',
		// 	tiles: ['https://cyberjapandata.gsi.go.jp/xyz/rinya_m/{z}/{x}/{y}.png'],
		// 	tileSize: 256,
		// 	minZoom: 14,
		// 	maxZoom: 18,
		// 	bounds: [122.933755, 24.045713, 153.986895, 45.556277],
		// 	attribution: '国土地理院'
		// } as RasterSourceSpecification
	},
	layers: [
		{
			id: 'base-map-layer',
			type: 'raster',
			source: 'base_usgs_imagery_only',
			maxzoom: 8.5
		} as RasterLayerSpecification,
		{
			id: 'base_seamlessphoto_layer',
			type: 'raster',
			source: 'base_seamlessphoto',
			minzoom: 8,
			maxzoom: 22
		} as RasterLayerSpecification
	]
};
