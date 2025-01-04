import type { RasterLayerSpecification } from 'maplibre-gl';

export interface Legend {
	name: string;
	colors: string[];
	labels: string[];
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
	| 22;

export interface TileXYZ {
	x: number;
	y: number;
	z: ZoomLevel;
}

export type RasterFormatType = 'image' | 'pmtiles';

export type TileSize = 512 | 256;

export interface RasterEntry {
	id: string;
	type: 'raster';
	format: {
		type: RasterFormatType;
		url: string;
	};
	metaData: {
		name: string;
		description: string;
		attribution: string;
		location: string;
		minZoom: number;
		maxZoom: number;
		tileSize: TileSize;
		xyzImageTile: TileXYZ | null;
		bounds: [number, number, number, number] | null;
		legend: Legend | null;
	};
	interaction: {
		clickable: boolean;
		overlay: boolean;
	};
	style: {
		type: 'basemap' | 'categorical' | 'dem';
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
	};
	debug: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	extension: any;
}
