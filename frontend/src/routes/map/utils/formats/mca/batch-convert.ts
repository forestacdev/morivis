import { validateMcaFileSet } from './batch';
import { mcaMeshesToGlb } from './glb';
import { createMcaFaceLimitError, resolveMcaMaxFaces } from './limits';
import { type McaMesh, meshMcaRegion } from './mesh';
import { MAX_REGION_BYTES, readMcaRegion, validateMcaOptions } from './region';
import type { McaOptions, McaProgress, McaResult } from './types';

/** 入力は1ファイルずつ展開し、共有の面数上限でメッシュの合計量を制限する。 */
export const mcaFilesToGlb = async (
	files: File[],
	options: McaOptions = {},
	onProgress?: (progress: McaProgress) => void
): Promise<McaResult> => {
	const regions = validateMcaFileSet(files);
	validateMcaOptions(options);
	const maxFaces = resolveMcaMaxFaces(options.maxFaces);
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
			const mesh = meshMcaRegion(region, progress, maxFaces - faceCount);
			meshes.push(mesh);
			chunkCount += region.chunkCount;
			blockCount += region.blockCount;
			faceCount += mesh.faceCount;
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
	return {
		glb: mcaMeshesToGlb(meshes),
		chunkCount,
		blockCount,
		faceCount,
		dataVersions: [...versions].sort((a, b) => a - b)
	};
};
