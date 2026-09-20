import type { McaParallelMesher } from './batch-convert';
import { mcaMeshesToGlb } from './glb';
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
	onProgress?: (progress: McaProgress) => void,
	parallelMesh?: McaParallelMesher
): Promise<McaResult> => {
	const region = await readMcaRegion(buffer, options, onProgress);
	const pack = options.resourcePackUrl && !parallelMesh
		? await loadMinecraftResourcePack(options.resourcePackUrl)
		: null;
	const maxFaces = resolveMcaMaxFaces(options.maxFaces);
	const meshes = parallelMesh
		? await parallelMesh(region, options.resourcePackUrl, maxFaces, onProgress)
		: [
			pack
				? await meshResourceRegion(region, pack, onProgress, maxFaces)
				: meshMcaRegion(region, onProgress, maxFaces)
		];
	return {
		glb: mcaMeshesToGlb(meshes, options.region !== undefined),
		chunkCount: region.chunkCount,
		blockCount: region.blockCount,
		faceCount: meshes.reduce((sum, mesh) => sum + mesh.faceCount, 0),
		dataVersions: region.dataVersions
	};
};
