import type { BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
import type { RasterBands } from '$routes/map/utils/formats/geotiff';

export type RasterRegistrationMode = 'raster' | 'mesh';

export interface GeoRefData {
	entryId: string;
	entryName: string;
	parsedBands: RasterBands;
	parsedNodata: number | null;
	dataRanges: BandDataRange[];
	numBands: number;
	imageWidth: number;
	imageHeight: number;
	bandMinMax: { min: number; max: number; };
	multiBandMinMax: {
		r: { min: number; max: number; };
		g: { min: number; max: number; };
		b: { min: number; max: number; };
	};
	imageFile: File;
	previewImageUrl?: string;
	initialCorners?: [[number, number], [number, number], [number, number], [number, number]];
	registrationMode: RasterRegistrationMode;
}

export interface GeoRefPreviewData {
	url: string;
	coordinates: [[number, number], [number, number], [number, number], [number, number]];
}
