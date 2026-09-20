import { validateMcaFileSet } from './batch';
import { mcaMeshesToGlb } from './glb';
import { createMcaFaceLimitError, resolveMcaMaxFaces } from './limits';
import { type McaMesh, meshMcaRegion } from './mesh';
import { MAX_REGION_BYTES, readMcaRegion, validateMcaOptions } from './region';
import { atlasMcaMeshes } from './resources/atlas';
import { meshResourceRegion } from './resources/mesh';
import { loadMinecraftResourcePack } from './resources/pack';
import type { McaOptions, McaProgress, McaRegion, McaResult } from './types';

export type McaParallelMesher = (
	region: McaRegion,
	resourcePackUrl: string | undefined,
	maxFaces: number,
	onProgress?: (progress: McaProgress) => void
) => Promise<McaMesh[]>;

/** 入力は1ファイルずつ展開し、共有の面数上限でメッシュの合計量を制限する。 */
export const mcaFilesToGlb = async (
	files: File[],
	options: McaOptions = {},
	onProgress?: (progress: McaProgress) => void,
	parallelMesh?: McaParallelMesher
): Promise<McaResult> => {
	const regions = validateMcaFileSet(files);
	validateMcaOptions(options);
	const maxFaces = resolveMcaMaxFaces(options.maxFaces);
	const pack = options.resourcePackUrl && !parallelMesh
		? await loadMinecraftResourcePack(options.resourcePackUrl)
		: null;
	const meshes: McaMesh[] = [];
	let chunkCount = 0;
	let blockCount = 0;
	let faceCount = 0;
	const versions = new Set<number>();
	for (const [index, file] of files.entries()) {
		try {
			if (file.size > MAX_REGION_BYTES) {
				throw new Error('MCAファイルは256 MiB以下にしてください');
			}
			const progress = (update: McaProgress) =>
				onProgress?.({
					...update,
					fileName: file.name,
					fileIndex: index + 1,
					fileCount: files.length
				});
			progress({ stage: 'read', completed: 0, total: 1024 });
			const region = await readMcaRegion(await file.arrayBuffer(), {
				...options,
				region: regions[index]
			}, progress);
			const parts = parallelMesh
				? await parallelMesh(
					region,
					options.resourcePackUrl,
					maxFaces - faceCount,
					progress
				)
				: [
					pack
						? await meshResourceRegion(region, pack, progress, maxFaces - faceCount)
						: meshMcaRegion(region, progress, maxFaces - faceCount)
				];
			meshes.push(...parts);
			chunkCount += region.chunkCount;
			blockCount += region.blockCount;
			faceCount += parts.reduce((sum, mesh) => sum + mesh.faceCount, 0);
			for (const version of region.dataVersions) versions.add(version);
		} catch (error) {
			throw new Error(
				`${file.name}: ${
					error instanceof Error && error.name === 'McaFaceLimitError'
						? createMcaFaceLimitError(maxFaces).message
						: error instanceof Error
						? error.message
						: 'MCAを読み込めませんでした'
				}`
			);
		}
	}
	await atlasMcaMeshes(meshes);
	return {
		glb: mcaMeshesToGlb(meshes),
		chunkCount,
		blockCount,
		faceCount,
		dataVersions: [...versions].sort((a, b) => a - b)
	};
};
