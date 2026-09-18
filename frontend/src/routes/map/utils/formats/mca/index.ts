import { mcaMeshToGlb } from './glb';
import { resolveMcaMaxFaces } from './limits';
import { meshMcaRegion } from './mesh';
import { readMcaRegion } from './region';
import type { McaOptions, McaProgress, McaResult } from './types';

export type { McaOptions, McaProgress, McaResult } from './types';

export const mcaToGlb = async (
	buffer: ArrayBuffer,
	options: McaOptions = {},
	onProgress?: (progress: McaProgress) => void
): Promise<McaResult> => {
	const region = await readMcaRegion(buffer, options, onProgress);
	const mesh = meshMcaRegion(region, onProgress, resolveMcaMaxFaces(options.maxFaces));
	return {
		glb: mcaMeshToGlb(mesh, options.region !== undefined),
		chunkCount: region.chunkCount,
		blockCount: region.blockCount,
		faceCount: mesh.faceCount,
		dataVersions: region.dataVersions
	};
};
