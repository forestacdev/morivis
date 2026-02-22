import type { BaseMapType } from '$routes/stores/layers';
import { ENTRY_PMTILES_RASTER_PATH } from '$routes/constants';

import type {
	RasterLayerSpecification,
	BackgroundLayerSpecification,
	RasterSourceSpecification,
	ColorReliefLayerSpecification
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
		type: 'relief',
		label: '標高地形図',
		src: 'https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png'
			.replace('{x}', String(basemapXYZ.x))
			.replace('{y}', String(basemapXYZ.y))
			.replace('{z}', String(basemapXYZ.z))
	},
	{
		type: 'slope',
		label: '傾斜量図',
		src: './images/base_map/slope.png'
	},
	{
		type: 'aspect',
		label: '傾斜方位図',
		src: './images/base_map/aspect.png'
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
		url: `pmtiles://${ENTRY_PMTILES_RASTER_PATH}/usgs_imagery_only.pmtiles`,

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
	}
	// base_gsi_rinya_m: {
	// 	type: 'raster',
	// 	tiles: ['https://forestacdev.github.io/tiles-ensyurin-photo/tiles/{z}/{x}/{y}.webp'],
	// 	tileSize: 256,
	// 	maxzoom: 18,
	// 	minzoom: 14,
	// 	attribution: ''
	// }
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
	}
	// {
	// 	id: 'base_gsi_rinya_m',
	// 	source: 'base_gsi_rinya_m',
	// 	type: 'raster',
	// 	maxzoom: 24,
	// 	minzoom: 12,
	// 	paint: {
	// 		'raster-opacity': 0.9,
	// 		'raster-brightness-min': 0,
	// 		'raster-brightness-max': 0.8
	// 	}
	// }
];

/** 標高段彩図 */
export const baseMapReliefSources: Record<string, RasterSourceSpecification> = {
	relief: {
		type: 'raster',
		tiles: [
			'webgl://https://tiles.mapterhorn.com/{z}/{x}/{y}.webp?entryId=base_map&formatType=image&demType=terrarium&mode=relief&max=4000&min=0&colorMap=gsi_relief&tileSize=512&x={x}&y={y}&z={z}'
		],
		maxzoom: 16,
		minzoom: 0,
		tileSize: 512
	}
};
export const baseMapReliefLayers: RasterLayerSpecification[] = [
	{
		id: 'relief_layer',
		source: 'relief',
		maxzoom: 24,
		minzoom: 0,
		type: 'raster',
		paint: {
			'raster-opacity': 1
		}
	}
];
// export const baseMapReliefLayers: ColorReliefLayerSpecification[] = [
// 	{
// 		id: 'color-relief',
// 		type: 'color-relief',
// 		source: 'terrain',
// 		paint: {
// 			'color-relief-color': [
// 				'interpolate',
// 				['linear'],
// 				['elevation'],
// 				-12000,
// 				'#000060',
// 				-8000,
// 				'#0000A0',
// 				-4000,
// 				'#0040C0',
// 				-2000,
// 				'#0080D0',
// 				-1000,
// 				'#00B0E0',
// 				-500,
// 				'#40D0E0',
// 				0,
// 				'#46BABA',
// 				300,
// 				'#B5A42D',
// 				1000,
// 				'#B4562D',
// 				2000,
// 				'#B4491C',
// 				4000,
// 				'#B43D09'
// 			]
// 		}
// 	}
// ];

/** 傾斜量図 */
export const baseMapSlopeSources: Record<string, RasterSourceSpecification> = {
	slope: {
		type: 'raster',
		tiles: [
			'webgl://https://tiles.mapterhorn.com/{z}/{x}/{y}.webp?entryId=base_map&formatType=image&demType=terrarium&mode=slope&max=90&min=0&colorMap=salinity&tileSize=512&x={x}&y={y}&z={z}'
		],
		maxzoom: 16,
		minzoom: 0,
		tileSize: 512
	}
};
export const baseMapSlopeLayers: RasterLayerSpecification[] = [
	{
		id: 'slope_layer',
		source: 'slope',
		maxzoom: 24,
		minzoom: 0,
		type: 'raster',
		paint: {
			'raster-opacity': 1
		}
	}
];

/** 傾斜方位図 */
export const baseMapAspectSources: Record<string, RasterSourceSpecification> = {
	aspect: {
		type: 'raster',
		tiles: [
			'webgl://https://tiles.mapterhorn.com/{z}/{x}/{y}.webp?entryId=base_map&formatType=image&demType=terrarium&mode=aspect&max=360&min=0&colorMap=rainbow-soft&tileSize=512&x={x}&y={y}&z={z}'
		],
		maxzoom: 16,
		minzoom: 0,
		tileSize: 512
	}
};
export const baseMapAspectLayers: RasterLayerSpecification[] = [
	{
		id: 'aspect_layer',
		source: 'aspect',
		maxzoom: 24,
		minzoom: 0,
		type: 'raster',
		paint: {
			'raster-opacity': 1
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
