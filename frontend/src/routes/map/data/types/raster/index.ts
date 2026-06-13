import type {
	AdjustableRange,
	BaseMetaData,
	Opacity,
	SharedDimensionState,
	SharedDiscreteDimension,
	SourceTemporalBehavior
} from '$routes/map/data/types';
import type { AuxiliaryLayersData } from '$routes/map/data/types/index';
import type { SequentialCount, SequentialScheme } from '$routes/map/utils/color/color-brewer';
import type { ColormapPresetName } from '$routes/map/utils/color/colormap-presets';
import type { RasterStylePreset } from '$routes/map/utils/style/raster-preset';

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
	labels: string[] | number[];
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

/** raster entry の配信・格納方式。可視化の種類とは独立して扱う。 */
export type RasterFormatType =
	| 'image'
	| 'pmtiles'
	| 'mbtiles'
	| 'cog'
	| 'tiff'
	| 'wcs'
	| 'geozarr';

export type TileSize = 512 | 256;

/** raster entry の主分類軸。morivis では raster を visualization ベースで分ける。 */
export type RasterStyleType = 'basemap' | 'categorical' | 'dem' | 'tiff' | 'cad';

export interface BaseRasterStyle {
	opacity: Opacity;
	visible?: boolean; // NOTE: 動的追加
	minZoom?: number;
	maxZoom?: number;
}

export interface RasterBaseMapStyle extends BaseRasterStyle {
	type: 'basemap';
	preset: RasterStylePreset;
	hueRotate: number;
	brightnessMin: number;
	brightnessMax: number;
	saturation: number;
	contrast: number;
}

export interface RasterCategoricalStyle extends BaseRasterStyle {
	type: 'categorical';
	resampling?: 'nearest' | 'linear';
	legend: CategoryLegend | GradientLegend | ImageLegend;
}

export interface RasterCadStyle extends BaseRasterStyle {
	type: 'cad';
	color: string;
}

export type ColorMapType = SequentialScheme | ColormapPresetName;

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

export interface DemLinearColorStyle {
	type: 'linear';
	colorMap: ColormapPresetName;
	range?: AdjustableRange;
	max?: number;
	min?: number;
}

export interface DemStepColorStyle {
	type: 'step';
	colorMap: SequentialScheme;
	divisions: SequentialCount;
	range?: AdjustableRange;
	max?: number;
	min?: number;
}

export type DemRangeColorStyle = DemLinearColorStyle | DemStepColorStyle;

export interface RasterDemStyle extends BaseRasterStyle {
	type: 'dem';
	visualization: {
		demType: DemDataTypeKey;
		mode: DemStyleMode;
		uniformsData: {
			relief: DemRangeColorStyle;
			slope?: DemRangeColorStyle;
			aspect?: {
				colorMap: ColorMapType;
			};
			// shadow: {
			// 	azimuth: number;
			// 	altitude: number;
			// };

			curvature?: {
				colorMap: ColorMapType;
			};
		};
	};
}

export type BandTypeKey = 'single' | 'multi' | 'twi' | 'slope' | 'aspect' | 'tpi' | 'topex';

export interface ShingleBandData {
	index: number;
	range?: AdjustableRange;
	min?: number;
	max?: number;
	colorMap: ColorMapType;
}

export interface DerivedBandData {
	range?: AdjustableRange;
	min?: number;
	max?: number;
	colorMap: ColorMapType;
}

export interface MultiBandData {
	r: { index: number; range?: AdjustableRange; min?: number; max?: number; }; // R
	g: { index: number; range?: AdjustableRange; min?: number; max?: number; }; // G
	b: { index: number; range?: AdjustableRange; min?: number; max?: number; }; // B
}

export interface RasterTiffStyle extends BaseRasterStyle {
	type: 'tiff';
	resampling?: 'nearest' | 'linear';
	visualization: {
		mode: BandTypeKey;
		uniformsData: {
			single: ShingleBandData;
			multi: MultiBandData;
			twi?: DerivedBandData;
			slope?: DerivedBandData;
			aspect?: DerivedBandData;
			tpi?: DerivedBandData;
			topex?: DerivedBandData;
		};
	};
}

interface RasterMetaData extends BaseMetaData {
	minZoom: number;
	tileSize: TileSize;
	/** 画像ソースの4コーナー座標 [NW, NE, SE, SW]。回転・変形した画像配置に使用 */
	imageCorners?: [[number, number], [number, number], [number, number], [number, number]];
}

export type RasterDiscreteDimension = SharedDiscreteDimension;

export type RasterDimensionState = SharedDimensionState;

export interface RasterEntryState {
	dimension?: RasterDimensionState;
}

export interface RasterTemporalProperties {
	dimension: RasterDiscreteDimension;
	behaviors?: SourceTemporalBehavior[];
}

export interface RasterBandProperties {
	numBands: number;
	sampleRanges?: { min: number; max: number; }[];
}

export interface RasterProperties {
	temporal?: RasterTemporalProperties;
	bands?: RasterBandProperties;
}

export interface RasterInteraction {
	clickable: boolean;
	overlay?: boolean;
}

interface BaseRasterEntry {
	id: string;
	type: 'raster';
	metaData: RasterMetaData;
	properties?: RasterProperties;
	interaction: RasterInteraction;
	auxiliaryLayers?: AuxiliaryLayersData;
	state?: RasterEntryState;
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

export interface RasterMBTilesEntry<T> extends BaseRasterEntry {
	format: {
		type: 'mbtiles';
		url: string;
	};
	style: T;
}

export interface RasterCogEntry<T> extends BaseRasterEntry {
	format: {
		type: 'cog';
		url: string;
		mode?: 'tile' | 'viewport';
	};
	style: T;
}

export interface RasterWcsEntry<T> extends BaseRasterEntry {
	format: {
		type: 'wcs';
		url: string;
		serviceUrl: string;
		version: string;
		coverageId: string;
		outputFormat: string;
		crs?: string;
		axisLabels?: string[];
	};
	style: T;
}

export interface RasterGeoZarrEntry<T> extends BaseRasterEntry {
	format: {
		type: 'geozarr';
		url: string;
		arrayPath?: string;
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
/**
 * morivis の raster 系内部モデル。
 * 配信形式は `format.type`、可視化の種類は `style.type` で表す。
 */
export type MorivisRasterEntry<T> =
	| RasterImageEntry<T>
	| RasterPMTilesEntry<T>
	| RasterMBTilesEntry<T>
	| RasterCogEntry<T>
	| RasterWcsEntry<T>
	| RasterGeoZarrEntry<T>;

/** 背景地図として扱う raster entry。 */
export type BaseMapRasterEntry = MorivisRasterEntry<RasterBaseMapStyle>;
/** カテゴリや凡例画像を持つ raster entry。 */
export type CategoricalRasterEntry = MorivisRasterEntry<RasterCategoricalStyle>;
/** 陰影・傾斜量などの DEM 可視化を持つ raster entry。 */
export type DemRasterEntry = MorivisRasterEntry<RasterDemStyle>;
/** GeoTIFF 系のバンド可視化を持つ raster entry。 */
export type TiffRasterEntry = MorivisRasterEntry<RasterTiffStyle>;
/** CAD 的な線表現を持つ raster entry。 */
export type CadRasterEntry = MorivisRasterEntry<RasterCadStyle>;
