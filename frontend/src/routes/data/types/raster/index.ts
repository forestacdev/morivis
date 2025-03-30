import type { RasterLayerSpecification } from 'maplibre-gl';
import type { AttributionKey } from '$routes/data/attribution';
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
	raster: {
		paint: RasterLayerSpecification['paint'];
		layout: RasterLayerSpecification['layout'];
	};
}

export interface RasterCategoricalStyle {
	type: 'categorical';
	opacity: number;
	visible?: boolean;
	legend: CategoryLegend | GradientLegend;
	raster: {
		paint: RasterLayerSpecification['paint'];
		layout: RasterLayerSpecification['layout'];
	};
}

export interface RasterDemStyle {
	type: 'dem';
	opacity: number;
	visible?: boolean;
	// TODO: DEMStyle;
	raster: {
		paint: RasterLayerSpecification['paint'];
		layout: RasterLayerSpecification['layout'];
	};
}

interface RasterMetaData extends BaseMetaData {
	minZoom: number;
	tileSize: TileSize;
	xyzImageTile: TileXYZ | null;
}

export interface RasterInteraction {
	clickable: boolean;
	overlay: boolean;
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

export type RasterEntry<T> = RasterImageEntry<T> | RasterPMTilesEntry<T>;
