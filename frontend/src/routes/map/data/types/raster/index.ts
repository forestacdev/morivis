import type { RasterLayerSpecification } from 'maplibre-gl';

export interface RasterEntry {
	id: string;
	type: 'raster';
	format: {
		type: 'image' | 'categorical' | 'dem';
		url: string;
	};
	metaData: {
		name: string;
		description: string;
		attribution: string;
		location: string;
		minZoom: number;
		maxZoom: number;
		xyzImageTile: { x: number; y: number; z: number } | null;
		bounds: [number, number, number, number] | null;
	};
	interaction: {
		clickable: boolean;
		overlay: boolean;
		legend: Record<string | number, string> | null;
	};
	style: {
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
