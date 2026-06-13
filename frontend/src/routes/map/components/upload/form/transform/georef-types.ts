import type { FeatureCollection } from '$routes/map/types/geojson';
import type { BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
import type { RasterBands } from '$routes/map/utils/formats/geotiff';
import type { GeoRefCorners } from '$routes/map/utils/transform/georef/homography';

export type RasterRegistrationMode = 'raster' | 'mesh';
export type GeoRefSourceType = 'raster' | 'vector';

export interface GeoRefData {
	sourceType: GeoRefSourceType;
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
	initialCorners?: GeoRefCorners;
	sourceFeatureCollection?: FeatureCollection;
	registrationMode: RasterRegistrationMode;
}

export interface GeoRefPreviewData {
	url: string;
	coordinates: [[number, number], [number, number], [number, number], [number, number]];
}

export interface GeoRefConfirmPayload {
	bbox: [number, number, number, number];
	corners: GeoRefCorners;
}
