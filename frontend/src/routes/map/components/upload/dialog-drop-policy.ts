import type { DialogType, UploadFiles } from '$routes/map/types';
import { isFileGdbRelatedFile } from '$routes/map/utils/formats/filegdb';
import { inspectGltfFile } from '$routes/map/utils/formats/gltf';
import { isRasterImageSidecarFile } from '$routes/map/utils/formats/raster/sidecar';
import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
import { resolveDroppedFiles, type UploadDropDecision } from './upload-drop';
import { getPathLikeName, hasExtension } from './upload-drop-matchers';

type PathLikeFile = File & { morivisRelativePath?: string; };

type SupplementaryDropMatcher = (
	currentFiles: UploadFiles,
	incomingFiles: File[]
) => boolean | Promise<boolean>;

const MODEL_TEXTURE_EXTENSIONS = [
	'.mtl',
	'.png',
	'.jpg',
	'.jpeg',
	'.bmp',
	'.tga',
	'.gif',
	'.webp',
	'.dds',
	'.spa',
	'.sph'
] as const;

const getPathCandidates = (value: string): string[] => {
	const normalizedValue = value.replace(/\\/g, '/').trim().toLowerCase();
	if (!normalizedValue) return [];

	const candidates = new Set<string>([normalizedValue]);
	const relativeWithoutRoot = normalizedValue.split('/').slice(1).join('/');
	const fileName = normalizedValue.split('/').pop();

	if (relativeWithoutRoot) {
		candidates.add(relativeWithoutRoot);
	}
	if (fileName) {
		candidates.add(fileName);
	}

	return [...candidates];
};

const getCurrentGltfExpectedResources = async (
	currentFiles: UploadFiles
): Promise<Set<string> | null> => {
	const gltfFile = toUploadFiles(currentFiles).find((file) => hasExtension(file, '.gltf'));
	if (!gltfFile) return null;

	try {
		const inspection = await inspectGltfFile(gltfFile);
		const expectedResources = new Set<string>();
		for (const value of [...inspection.externalBufferUris, ...inspection.externalImageUris]) {
			for (const candidate of getPathCandidates(value)) {
				expectedResources.add(candidate);
			}
		}
		return expectedResources;
	} catch {
		return null;
	}
};

const matchesExpectedGltfResource = (file: File, expectedResources: Set<string>) => {
	return getPathCandidates(getPathLikeName(file)).some((candidate) =>
		expectedResources.has(candidate)
	);
};

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
	sxf: (_currentFiles, files) =>
		files.length > 0
		&& files.every(
			(file) =>
				hasExtension(file, '.saf') || hasExtension(file, '.tif')
				|| hasExtension(file, '.tiff')
		),
	model: async (currentFiles, files) => {
		if (files.length === 0) return false;
		if (
			files.every((file) =>
				MODEL_TEXTURE_EXTENSIONS.some((extension) => hasExtension(file, extension))
			)
		) {
			return true;
		}

		const expectedResources = await getCurrentGltfExpectedResources(currentFiles);
		if (!expectedResources || expectedResources.size === 0) return false;
		return files.every((file) => matchesExpectedGltfResource(file, expectedResources));
	},
	geotiff: (_currentFiles, files) =>
		files.length > 0 && files.every((file) => isRasterImageSidecarFile(file)),
	filegdb: (_currentFiles, files) =>
		files.length > 0 && files.every((file) => isFileGdbRelatedFile(file))
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
	if (await supplementaryDropMatcher?.(currentFiles, incomingFiles)) {
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
