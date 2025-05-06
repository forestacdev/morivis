import type { BaseMetaData } from '$routes/data/types';
export interface CategoryLegend {
	type: 'category';
	name: string;
	colors: string[];
	labels: string[];
}

export interface GradientLegend {
	type: 'gradient';
	name: string;
	colors: string[];
	range: number[];
	unit: string;
}

export type ZoomLevel =
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| 13
	| 14
	| 15
	| 16
	| 17
	| 18
	| 19
	| 20
	| 21
	| 22
	| 23
	| 24;

export interface TileXYZ {
	x: number;
	y: number;
	z: ZoomLevel;
}

export type RasterFormatType = 'image' | 'pmtiles' | 'cog' | 'tiff';

export type TileSize = 512 | 256;

export interface RasterBaseMapStyle {
	type: 'basemap';
	opacity: number;
	visible?: boolean;
	hueRotate: number;
	brightnessMin: number;
	brightnessMax: number;
	saturation: number;
	contrast: number;
}

// TODO: グループ化したスタイルの型を定義する
export interface RasterBaseGroupMapStyle {
	type: 'basemap';
	opacity: number;
	visible?: boolean;
	hueRotate: number;
	brightnessMin: number;
	brightnessMax: number;
	saturation: number;
	contrast: number;
	tile: {
		key: string;
		tiles: {
			key: string;
			name: string;
			url: string;
		}[];
	};
}

export interface RasterCategoricalStyle {
	type: 'categorical';
	opacity: number;
	visible?: boolean;
	legend: CategoryLegend | GradientLegend;
}

export const DEM_DATA_TYPE = {
	rgb: 1,
	gsi: 2
} as const;

export type DemDataType = typeof DEM_DATA_TYPE;
export type DemDataTypeKey = keyof DemDataType;

export const COLOR_MAP_TYPE = {
	jet: 1,
	hsv: 2,
	hot: 3,
	cool: 4,
	spring: 5,
	summer: 6,
	autumn: 7,
	winter: 8,
	bone: 9,
	copper: 10,
	greys: 11,
	yignbu: 12,
	greens: 13,
	yiorrd: 14,
	bluered: 15,
	rdbu: 16,
	picnic: 17,
	rainbow: 18,
	portland: 19,
	blackbody: 20,
	earth: 21,
	electric: 22,
	alpha: 23,
	viridis: 24,
	inferno: 25,
	magma: 26,
	plasma: 27,
	warm: 28,
	rainbowSoft: 29,
	bathymetry: 30,
	cdom: 31,
	chlorophyll: 32,
	density: 33,
	freesurfaceBlue: 34,
	freesurfaceRed: 35,
	oxygen: 36,
	par: 37,
	phase: 38,
	salinity: 39,
	temperature: 40,
	turbidity: 41,
	velocityBlue: 42,
	velocityGreen: 43,
	cubehelix: 44
} as const;

export type ColorMapType = typeof COLOR_MAP_TYPE;
export type ColorMapTypeKey = keyof ColorMapType;

export interface RasterDemStyle {
	type: 'dem';
	opacity: number;
	visible?: boolean;
	visualization: {
		demType: DemDataTypeKey;
		mode: 'evolution' | 'shadow' | 'slope' | 'aspect' | 'curvature';
		uniformsData: {
			shadow: {
				azimuth: number;
				altitude: number;
			};
			slope: {
				colorMap: ColorMapTypeKey;
			};
			evolution: {
				max: number;
				min: number;
				colorMap: ColorMapTypeKey;
			};
			aspect: {
				colorMap: ColorMapTypeKey;
			};
			curvature: {
				ridgeThreshold: number;
				valleyThreshold: number;
				ridgeColor: string;
				valleyColor: string;
			};
		};
	};
}

interface RasterMetaData extends BaseMetaData {
	minZoom: number;
	tileSize: TileSize;
	xyzImageTile?: TileXYZ;
}

export interface RasterInteraction {
	clickable: boolean;
}

interface BaseRasterEntry {
	id: string;
	type: 'raster';
	metaData: RasterMetaData;
	interaction: RasterInteraction;
}

export interface RasterImageEntry<T> extends BaseRasterEntry {
	format: {
		type: 'image';
		url: string;
	};
	style: T;
}

export interface RasterPMTilesEntry<T> extends BaseRasterEntry {
	format: {
		type: 'pmtiles';
		url: string;
	};
	style: T;
}

export interface RasterImageGroupEntry<T> extends BaseRasterEntry {
	format: {
		type: 'image';
	};
	style: T;
}

export type RasterEntry<T> = RasterImageEntry<T> | RasterPMTilesEntry<T>;
