import type { BaseMetaData, Opacity } from '$routes/map/data/types';
import type { RasterStylePreset } from '$routes/map/utils/raster';

export const DEM_DATA_TYPE = {
	mapbox: 0.0,
	gsi: 1.0,
	terrarium: 2.0
} as const;

export type DemDataType = typeof DEM_DATA_TYPE;
export type DemDataTypeKey = keyof DemDataType;

interface ImageLegendCategory {
	name: string;
	urls: string[];
	labels: string[];
}
export interface ImageLegend {
	type: 'image';
	categories: ImageLegendCategory[];
}
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
	ranges: number[];
	unit: string;
}

export type ZoomLevel =
	| 0
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
	opacity: Opacity;
	visible?: boolean;
	preset: RasterStylePreset;
	hueRotate: number;
	brightnessMin: number;
	brightnessMax: number;
	saturation: number;
	contrast: number;
}

// TODO: グループ化したスタイルの型を定義する
export interface RasterBaseGroupMapStyle {
	type: 'basemap';
	opacity: Opacity;
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
	opacity: Opacity;
	visible?: boolean;
	resampling?: 'nearest' | 'linear';
	legend: CategoryLegend | GradientLegend | ImageLegend;
}

export const COLOR_MAP_TYPE = [
	'jet',
	'hsv',
	'hot',
	'spring',
	'summer',
	'autumn',
	'winter',
	'bone',
	'copper',
	'greys',
	'yignbu',
	'greens',
	'yiorrd',
	'bluered',
	'rdbu',
	'picnic',
	'rainbow',
	'portland',
	'blackbody',
	'earth',
	'electric',
	'viridis',
	'inferno',
	'magma',
	'plasma',
	'warm',
	'cool',
	'rainbow-soft',
	'bathymetry',
	'cdom',
	'chlorophyll',
	'density',
	'freesurface-blue',
	'freesurface-red',
	'oxygen',
	'par',
	'phase',
	'salinity',
	'temperature',
	'turbidity',
	'velocity-blue',
	'velocity-green',
	'cubehelix'
] as const;

export type ColorMapType = (typeof COLOR_MAP_TYPE)[number];

export const DEM_STYLE_TYPE = {
	default: 0.0,
	relief: 1.0,
	slope: 2.0,
	aspect: 3.0,
	curvature: 4.0,
	shadow: 5.0
} as const;

export type DemStyleMode = keyof typeof DEM_STYLE_TYPE;
export type DemStyleModeNum = (typeof DEM_STYLE_TYPE)[keyof typeof DEM_STYLE_TYPE];

export interface RasterDemStyle {
	type: 'dem';
	opacity: Opacity;
	visible?: boolean;
	visualization: {
		demType: DemDataTypeKey;
		mode: DemStyleMode;
		uniformsData: {
			relief: {
				max: number;
				min: number;
				colorMap: ColorMapType;
			};
			slope?: {
				max: number;
				min: number;
				colorMap: ColorMapType;
			};
			aspect?: {
				colorMap: ColorMapType;
			};
			// shadow: {
			// 	azimuth: number;
			// 	altitude: number;
			// };

			// curvature: {
			// 	ridgeThreshold: number;
			// 	valleyThreshold: number;
			// 	ridgeColor: string;
			// 	valleyColor: string;
			// 	colorMap: ColorMapType;
			// };
		};
	};
}

export type BandTypeKey = 'single' | 'multi';

export interface ShingleBandData {
	index: number;
	min: number;
	max: number;
	colorMap: ColorMapType;
}

export interface MultiBandData {
	r: { index: number; min: number; max: number }; // R
	g: { index: number; min: number; max: number }; // G
	b: { index: number; min: number; max: number }; // B
}

export interface RasterTiffStyle {
	type: 'tiff';
	opacity: Opacity;
	visible?: boolean;
	visualization: {
		numBands: number;
		mode: BandTypeKey;
		uniformsData: {
			single: ShingleBandData;
			multi: MultiBandData;
		};
	};
}

interface RasterMetaData extends BaseMetaData {
	minZoom: number;
	tileSize: TileSize;
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

// TODO グループ化したスタイルの型を定義する
export interface RasterImageGroupEntry<T> extends BaseRasterEntry {
	format: {
		type: 'image';
	};
	style: T;
}

export type RasterDemEntry = RasterImageEntry<RasterDemStyle> | RasterPMTilesEntry<RasterDemStyle>;

export type RasterEntry<T> = RasterImageEntry<T> | RasterPMTilesEntry<T>;
