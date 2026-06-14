import type { Opacity } from '$routes/map/data/types';
import type { RasterDiscreteDimension } from '$routes/map/data/types/raster';
import type { BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
import type { RasterBands } from '$routes/map/utils/formats/geotiff';
import type { GeoRefCorners } from '$routes/map/utils/transform/georef/homography';

export type RasterRegistrationMode = 'raster' | 'mesh';
export type GeoRefSourceType = 'raster' | 'vector' | 'pointcloud';
export type GeoRefTransformMode = 'projective' | 'aspect-locked';

export interface GeoRefMeshConfig {
	baseValue?: number;
	heightScale?: number;
	autoHeightScale?: boolean;
	attribution?: string;
	opacity?: Opacity;
	shadingEnabled?: boolean;
	heightColorRampEnabled?: boolean;
	temporalDimension?: RasterDiscreteDimension;
	initialDimensionIndex?: number;
}

export interface GeoRefPointCloudConfig {
	positions: Float32Array;
	colors?: Uint8Array;
	pointCount: number;
	sourceBbox: [number, number, number, number];
}

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
	sourceFeatureCollectionId?: string;
	registrationMode: RasterRegistrationMode;
	allowRegistrationModeChange?: boolean;
	meshConfig?: GeoRefMeshConfig;
	pointCloudConfig?: GeoRefPointCloudConfig;
}

export interface GeoRefPreviewData {
	url: string;
	coordinates: [[number, number], [number, number], [number, number], [number, number]];
}

export interface GeoRefConfirmPayload {
	bbox: [number, number, number, number];
	corners: GeoRefCorners;
}
