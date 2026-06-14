import type {
	GeoRefData,
	GeoRefMeshConfig,
	RasterRegistrationMode
} from '$routes/map/components/upload/form/transform/georef-types';
import type { BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
import type { RasterBands } from '$routes/map/utils/formats/geotiff';

import { generateThumbnail } from './thumbnail';

interface CreateRasterGeoRefDataParams {
	entryId: string;
	entryName: string;
	parsedBands: RasterBands;
	parsedNodata: number | null;
	dataRanges: BandDataRange[];
	imageWidth: number;
	imageHeight: number;
	imageFile: File;
	registrationMode: RasterRegistrationMode;
	meshConfig?: GeoRefMeshConfig;
}

export const createRasterGeoRefData = ({
	entryId,
	entryName,
	parsedBands,
	parsedNodata,
	dataRanges,
	imageWidth,
	imageHeight,
	imageFile,
	registrationMode,
	meshConfig
}: CreateRasterGeoRefDataParams): GeoRefData => {
	const firstRange = dataRanges[0] ?? { min: 0, max: 255 };
	const secondRange = dataRanges[1] ?? firstRange;
	const thirdRange = dataRanges[2] ?? secondRange;

	return {
		sourceType: 'raster',
		entryId,
		entryName,
		parsedBands,
		parsedNodata,
		dataRanges,
		numBands: parsedBands.length,
		imageWidth,
		imageHeight,
		bandMinMax: firstRange,
		multiBandMinMax: {
			r: firstRange,
			g: secondRange,
			b: thirdRange
		},
		imageFile,
		previewImageUrl: generateThumbnail({
			bands: parsedBands,
			width: imageWidth,
			height: imageHeight,
			nodata: parsedNodata,
			ranges: dataRanges
		}),
		registrationMode,
		meshConfig
	};
};
