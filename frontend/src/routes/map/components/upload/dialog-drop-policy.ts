import { isFileGdbRelatedFile } from '$routes/map/utils/formats/filegdb';
import { isRasterImageSidecarFile } from '$routes/map/utils/formats/raster/sidecar';
import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
import type { DialogType, UploadFiles } from '$routes/map/types';
import { resolveDroppedFiles, type UploadDropDecision } from './upload-drop';
import { hasExtension } from './upload-drop-matchers';

type PathLikeFile = File & { morivisRelativePath?: string; };

type SupplementaryDropMatcher = (files: File[]) => boolean;

const OBJ_SUPPLEMENTARY_EXTENSIONS = [
	'.mtl',
	'.png',
	'.jpg',
	'.jpeg',
	'.bmp',
	'.tga',
	'.gif',
	'.webp'
] as const;

export type OpenDialogDropDecision =
	| {
			type: 'stay';
			dropFiles: File[];
	  }
	| {
			type: 'delegate';
			decision: UploadDropDecision;
	  };

const getFileKey = (file: File): string => {
	const relativePath = ((file as PathLikeFile).morivisRelativePath ?? '').toLowerCase();
	return `${relativePath}:${file.name}:${file.size}:${file.lastModified}`;
};

const mergeFiles = (currentFiles: UploadFiles, incomingFiles: File[]): File[] => {
	const merged = new Map<string, File>();

	for (const file of toUploadFiles(currentFiles)) {
		merged.set(getFileKey(file), file);
	}

	for (const file of incomingFiles) {
		merged.set(getFileKey(file), file);
	}

	return [...merged.values()];
};

const supplementaryDropMatchers: Partial<
	Record<Exclude<DialogType, null>, SupplementaryDropMatcher>
> = {
	sxf: (files) =>
		files.length > 0
		&& files.every(
			(file) =>
				hasExtension(file, '.saf') || hasExtension(file, '.tif') || hasExtension(file, '.tiff')
		),
	glb: (files) =>
		files.length > 0
		&& files.every((file) =>
			OBJ_SUPPLEMENTARY_EXTENSIONS.some((extension) => hasExtension(file, extension))
		),
	geotiff: (files) => files.length > 0 && files.every((file) => isRasterImageSidecarFile(file)),
	filegdb: (files) => files.length > 0 && files.every((file) => isFileGdbRelatedFile(file))
};

export const resolveOpenDialogDrop = async (
	dialogType: DialogType,
	currentFiles: UploadFiles,
	incomingFiles: File[]
): Promise<OpenDialogDropDecision> => {
	if (!dialogType) {
		return {
			type: 'delegate',
			decision: await resolveDroppedFiles(incomingFiles)
		};
	}

	const supplementaryDropMatcher = supplementaryDropMatchers[dialogType];
	if (supplementaryDropMatcher?.(incomingFiles)) {
		return {
			type: 'stay',
			dropFiles: mergeFiles(currentFiles, incomingFiles)
		};
	}

	const decision = await resolveDroppedFiles(incomingFiles);
	if (decision.type === 'dialog' && decision.dialogType === dialogType) {
		return {
			type: 'stay',
			dropFiles: decision.dropFiles ?? incomingFiles
		};
	}

	return {
		type: 'delegate',
		decision
	};
};
