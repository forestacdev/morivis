import { mcaMeshToGlb } from './glb';
import { resolveMcaMaxFaces } from './limits';
import { meshMcaRegion } from './mesh';
import { readMcaRegion } from './region';
import { meshResourceRegion } from './resources/mesh';
import { loadMinecraftResourcePack } from './resources/pack';
import type { McaOptions, McaProgress, McaResult } from './types';

export type { McaOptions, McaProgress, McaResult } from './types';

export const mcaToGlb = async (
	buffer: ArrayBuffer,
	options: McaOptions = {},
	onProgress?: (progress: McaProgress) => void
): Promise<McaResult> => {
	const region = await readMcaRegion(buffer, options, onProgress);
	const pack = options.resourcePackUrl
		? await loadMinecraftResourcePack(options.resourcePackUrl)
		: null;
	const maxFaces = resolveMcaMaxFaces(options.maxFaces);
	const mesh = pack
		? await meshResourceRegion(region, pack, onProgress, maxFaces)
		: meshMcaRegion(region, onProgress, maxFaces);
	return {
		glb: mcaMeshToGlb(mesh, options.region !== undefined),
		chunkCount: region.chunkCount,
		blockCount: region.blockCount,
		faceCount: mesh.faceCount,
		dataVersions: region.dataVersions
	};
};
