import type { BaseMapType } from '$routes/stores/layers';

import type {
	RasterLayerSpecification,
	BackgroundLayerSpecification,
	RasterSourceSpecification
} from 'maplibre-gl';

const basemapXYZ = { x: 28846, y: 12917, z: 15 };
export const baseMapList: {
	type: BaseMapType;
	label: string;
	src: string;
}[] = [
	{
		type: 'satellite',
		label: '航空写真',
		src: 'https://cyberjapandata.gsi.go.jp/xyz/nendophoto2018/{z}/{x}/{y}.png'
			.replace('{x}', String(basemapXYZ.x))
			.replace('{y}', String(basemapXYZ.y))
			.replace('{z}', String(basemapXYZ.z))
	},
	{
		type: 'hillshade',
		label: '地形図',
		src: 'https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'
			.replace('{x}', String(basemapXYZ.x))
			.replace('{y}', String(basemapXYZ.y))
			.replace('{z}', String(basemapXYZ.z))
	},
	{
		type: 'osm',
		label: 'OpenStreetMap',
		src: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
			.replace('{x}', String(basemapXYZ.x))
			.replace('{y}', String(basemapXYZ.y))
			.replace('{z}', String(basemapXYZ.z))
	}
];

/** 航空写真 */
export const baseMapSatelliteSources: Record<string, RasterSourceSpecification> = {
	base_usgs_imagery_only: {
		type: 'raster',
		// tiles: [
		// 	'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'
		// ],
		tiles: ['https://forestacdev.github.io/tiles-usgs-imagery-only/tiles/{z}/{x}/{y}.webp'],

		tileSize: 256,
		maxzoom: 8,
		attribution: 'USGS'
	},
	base_seamlessphoto: {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
		tileSize: 256,
		minzoom: 1,
		maxzoom: 18,
		bounds: [122.933755, 24.045713, 153.986895, 45.556277],
		attribution: '国土地理院'
	},
	base_gsi_rinya_m: {
		type: 'raster',
		tiles: ['https://forestacdev.github.io/tiles-ensyurin-photo/tiles/{z}/{x}/{y}.webp'],
		tileSize: 256,
		maxzoom: 18,
		minzoom: 14,
		attribution: ''
	}
};

export const baseMapSatelliteLayers: RasterLayerSpecification[] = [
	{
		id: 'base_map_usgs_layer',
		type: 'raster',
		source: 'base_usgs_imagery_only',
		maxzoom: 9,
		paint: {
			'raster-opacity': 0.9,
			'raster-brightness-min': 0,
			'raster-brightness-max': 0.8
		}
	},
	{
		id: 'base_seamlessphoto_layer',
		type: 'raster',
		source: 'base_seamlessphoto',
		minzoom: 8,
		maxzoom: 24,
		paint: {
			'raster-opacity': 0.9,
			'raster-brightness-min': 0,
			'raster-brightness-max': 0.8
		}
	},
	{
		id: 'base_gsi_rinya_m',
		source: 'base_gsi_rinya_m',
		type: 'raster',
		maxzoom: 24,
		minzoom: 12,
		paint: {
			'raster-opacity': 0.9,
			'raster-brightness-min': 0,
			'raster-brightness-max': 0.8
		}
	}
];

/** 地形図 */
export const baseMaphillshadeSources: Record<string, RasterSourceSpecification> = {
	earthhillshade: {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/earthhillshade/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 0,
		maxzoom: 18,
		attribution: '地理院タイル'
	},
	hillshademap: {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 16,
		attribution: '地理院タイル'
	}
};

export const baseMaphillshadeLayers: (RasterLayerSpecification | BackgroundLayerSpecification)[] = [
	{
		id: 'background_layer',
		type: 'background',
		paint: {
			'background-color': '#FFFFEE'
		}
	},
	{
		id: 'earthhillshade_layer',
		source: 'earthhillshade',
		type: 'raster',
		maxzoom: 8,
		paint: {
			'raster-opacity': 0.7
		}
	},
	{
		id: 'hillshademap_layer',
		source: 'hillshademap',
		type: 'raster',
		minzoom: 2,
		maxzoom: 24,
		paint: {
			'raster-opacity': 0.7
		}
	}
];

/** osm */
export const baseMapOsmSources: Record<string, RasterSourceSpecification> = {
	osm: {
		type: 'raster',
		tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 0,
		maxzoom: 24,
		attribution: '© OpenStreetMap contributors'
	}
};

export const baseMapOsmLayers: (RasterLayerSpecification | BackgroundLayerSpecification)[] = [
	{
		id: 'osm_layer',
		source: 'osm',
		type: 'raster',
		minzoom: 0,
		maxzoom: 24,
		paint: {
			'raster-opacity': 0.9,
			'raster-brightness-min': 0,
			'raster-brightness-max': 0.9
		}
	}
];
