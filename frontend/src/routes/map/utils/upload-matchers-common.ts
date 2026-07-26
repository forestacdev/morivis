import { SUPPORTED_FILE_EXTENSIONS, type UploadFiles } from '$routes/map/types';

const TILE_URL_EXTENSIONS = ['.geojson', '.pbf', '.mvt', '.png', '.jpg', '.jpeg', '.webp', '.avif'];

export const getMatchedExtension = (fileName: string): string | null => {
	const lowerFileName = fileName.toLowerCase();
	const sortedExtensions = [...SUPPORTED_FILE_EXTENSIONS].sort((a, b) => b.length - a.length);
	return sortedExtensions.find((ext) => lowerFileName.endsWith(ext)) ?? null;
};

export const getTileUrlExtension = (fileName: string): string | null => {
	const lowerFileName = fileName.toLowerCase();
	return TILE_URL_EXTENSIONS.find((ext) => lowerFileName.endsWith(ext)) ?? null;
};

export const toUploadFiles = (value: File | FileList | UploadFiles): File[] => {
	if (!value) return [];
	if (Array.isArray(value)) return value;
	if (value instanceof File) return [value];
	return Array.from(value);
};

export const getFirstUploadFile = (value: File | FileList | UploadFiles): File | null => {
	return toUploadFiles(value)[0] ?? null;
};
