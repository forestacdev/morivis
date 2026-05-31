type PathLikeFile = File & { morivisRelativePath?: string };
const RASTER_IMAGE_EXTENSION_PATTERN = /\.(?:png|jpe?g|webp|tif|tiff)$/i;
const RASTER_WORLD_FILE_EXTENSION_PATTERN = /\.(?:tfw|tifw|tiffw|pgw|jgw|wld)$/i;
const RASTER_AUX_XML_EXTENSION_PATTERN = /\.aux\.xml$/i;

export const getRasterPathLikeName = (file: File): string => {
	return (((file as PathLikeFile).morivisRelativePath ?? file.name) || '').toLowerCase();
};

const isRasterImageMainName = (name: string): boolean => RASTER_IMAGE_EXTENSION_PATTERN.test(name);
const isRasterWorldFileName = (name: string): boolean =>
	RASTER_WORLD_FILE_EXTENSION_PATTERN.test(name);
const isRasterAuxXmlName = (name: string): boolean => RASTER_AUX_XML_EXTENSION_PATTERN.test(name);
const stripRasterImageExtension = (name: string): string =>
	name.replace(RASTER_IMAGE_EXTENSION_PATTERN, '');
const stripRasterWorldExtension = (name: string): string =>
	name.replace(RASTER_WORLD_FILE_EXTENSION_PATTERN, '');
const stripRasterAuxXmlExtension = (name: string): string =>
	name.replace(RASTER_AUX_XML_EXTENSION_PATTERN, '');

const getRasterSidecarBaseCandidates = (name: string): string[] => {
	if (isRasterWorldFileName(name)) {
		return [stripRasterWorldExtension(name)];
	}

	if (isRasterAuxXmlName(name)) {
		const withoutAuxXml = stripRasterAuxXmlExtension(name);
		if (isRasterImageMainName(withoutAuxXml)) {
			return [withoutAuxXml, stripRasterImageExtension(withoutAuxXml)];
		}
		return [withoutAuxXml];
	}

	return [];
};

export const isRasterImageMainFile = (file: File): boolean =>
	isRasterImageMainName(getRasterPathLikeName(file));

export const findRasterImageFile = (files: Iterable<File>): File | null =>
	Array.from(files).find((file) => isRasterImageMainFile(file)) ?? null;

export const isRasterImageSidecarFile = (file: File): boolean => {
	const name = getRasterPathLikeName(file);
	return isRasterWorldFileName(name) || isRasterAuxXmlName(name);
};

export const hasMatchingRasterSidecar = (imageFile: File, sidecarFile: File): boolean => {
	const imageName = getRasterPathLikeName(imageFile);
	if (!isRasterImageMainName(imageName)) return false;

	const imageBase = stripRasterImageExtension(imageName);
	return getRasterSidecarBaseCandidates(getRasterPathLikeName(sidecarFile)).some(
		(candidate) => candidate === imageName || candidate === imageBase
	);
};

export const findGeoReferencedImageFile = (files: Iterable<File>): File | null => {
	const fileArray = Array.from(files);
	return (
		fileArray.find(
			(imageFile) =>
				isRasterImageMainFile(imageFile) &&
				fileArray.some(
					(sidecarFile) =>
						sidecarFile !== imageFile && hasMatchingRasterSidecar(imageFile, sidecarFile)
				)
		) ?? null
	);
};

export const findMatchingWorldFile = (files: Iterable<File>, imageFile: File): File | null => {
	return (
		Array.from(files).find(
			(file) =>
				isRasterWorldFileName(getRasterPathLikeName(file)) &&
				hasMatchingRasterSidecar(imageFile, file)
		) ?? null
	);
};

export const findMatchingAuxXmlFile = (files: Iterable<File>, imageFile: File): File | null => {
	return (
		Array.from(files).find(
			(file) =>
				isRasterAuxXmlName(getRasterPathLikeName(file)) && hasMatchingRasterSidecar(imageFile, file)
		) ?? null
	);
};
