import type { ChunkMeshRequest, ChunkMeshResponse } from './chunk-mesh.worker';
import ChunkMeshWorker from './chunk-mesh.worker?worker';
import { partitionMcaChunks } from './chunk-partitions';
import { createMcaFaceLimitError } from './limits';
import type { McaMesh } from './mesh';
import type { McaProgress, McaRegion } from './types';

export class McaChunkMeshPool {
	private workers: Worker[] = [];
	private cancelActive?: () => void;
	dispose = () => {
		for (const worker of this.workers) worker.terminate();
		this.workers = [];
		this.cancelActive?.();
		this.cancelActive = undefined;
	};
	mesh = async (
		region: McaRegion,
		resourcePackUrl: string | undefined,
		maxFaces: number,
		onProgress?: (progress: McaProgress) => void
	): Promise<McaMesh[]> => {
		const partitions = partitionMcaChunks(region);
		if (!partitions.length) throw new Error('指定範囲に表示できるブロックがありません');
		const completed = partitions.map(() => 0);
		const meshes: McaMesh[] = new Array(partitions.length);
		let next = 0, finished = 0, faceCount = 0;
		onProgress?.({ stage: 'mesh', completed: 0, total: region.sections.size });
		try {
			await new Promise<void>((resolve, reject) => {
				let settled = false;
				const fail = (error: Error) => {
					if (settled) return;
					settled = true;
					reject(error);
				};
				this.cancelActive = () =>
					fail(new DOMException('読み込みをキャンセルしました', 'AbortError'));
				const dispatch = (worker: Worker) => {
					if (settled || next >= partitions.length) return;
					const index = next++, partition = partitions[index];
					worker.onmessage = ({ data }: MessageEvent<ChunkMeshResponse>) => {
						if (settled) return;
						if ('error' in data) {
							fail(
								data.name === 'McaFaceLimitError'
									? createMcaFaceLimitError(maxFaces)
									: Object.assign(new Error(data.error), {
										name: data.name ?? 'Error'
									})
							);
							return;
						}
						if ('progress' in data) completed[index] = data.progress.completed;
						else {
							faceCount += data.mesh.faceCount;
							if (faceCount > maxFaces) {
								fail(createMcaFaceLimitError(maxFaces));
								return;
							}
							meshes[index] = data.mesh;
							completed[index] = partition.ownedSections.size;
							finished++;
						}
						onProgress?.({
							stage: 'mesh',
							completed: completed.reduce((sum, n) => sum + n, 0),
							total: region.sections.size
						});
						if ('mesh' in data) {
							if (finished === partitions.length) {
								settled = true;
								resolve();
							} else dispatch(worker);
						}
					};
					worker.onerror = (event) =>
						fail(new Error(`チャンクの変換に失敗しました: ${event.message}`));
					worker.onmessageerror = () =>
						fail(new Error('チャンクの変換結果を受け取れませんでした'));
					try {
						worker.postMessage(
							{
								...partition,
								resourcePackUrl,
								maxFaces: maxFaces - faceCount
							} satisfies ChunkMeshRequest
						);
					} catch (error) {
						fail(
							error instanceof Error
								? error
								: new Error('チャンクを送信できませんでした')
						);
					}
				};
				for (let index = 0; index < Math.min(4, partitions.length) && !settled; index++) {
					dispatch(this.workers[index] ??= new ChunkMeshWorker());
				}
			});
			if (!faceCount) throw new Error('指定範囲に表示できるブロックがありません');
			return meshes.filter((mesh) => mesh.faceCount > 0);
		} catch (error) {
			this.dispose();
			throw error;
		} finally {
			this.cancelActive = undefined;
		}
	};
}
