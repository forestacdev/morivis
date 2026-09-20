import type { McaChunkPartition } from './chunk-partitions';
import { type McaMesh, meshMcaRegion } from './mesh';
import { meshResourceRegion } from './resources/mesh';
import { loadMinecraftResourcePack, type MinecraftResourcePack } from './resources/pack';
import type { McaProgress } from './types';

export interface ChunkMeshRequest extends McaChunkPartition {
	resourcePackUrl?: string;
	maxFaces: number;
}
export type ChunkMeshResponse = { mesh: McaMesh; } | { progress: McaProgress; } | {
	error: string;
	name?: string;
};
let packUrl: string | undefined;
let pack: Promise<MinecraftResourcePack | null> = Promise.resolve(null);

self.onmessage = async ({ data }: MessageEvent<ChunkMeshRequest>) => {
	try {
		if (data.resourcePackUrl !== packUrl) {
			packUrl = data.resourcePackUrl;
			pack = packUrl ? loadMinecraftResourcePack(packUrl) : Promise.resolve(null);
		}
		let lastProgress = 0;
		const progress = (update: McaProgress) => {
			const now = performance.now();
			if (now - lastProgress < 100 && update.completed !== update.total) return;
			lastProgress = now;
			postMessage({ progress: update } satisfies ChunkMeshResponse);
		};
		const resources = await pack;
		const mesh = resources
			? await meshResourceRegion(
				data.region,
				resources,
				progress,
				data.maxFaces,
				data.ownedSections
			)
			: meshMcaRegion(data.region, progress, data.maxFaces, data.ownedSections);
		// 画像はWorker内キャッシュでも使うため転送せず、巨大なジオメトリだけ所有権を移す。
		const transfer = [
			mesh.positions.buffer,
			mesh.normals.buffer,
			mesh.colors.buffer,
			mesh.indices.buffer
		];
		if (mesh.uvs) transfer.push(mesh.uvs.buffer);
		postMessage({ mesh } satisfies ChunkMeshResponse, { transfer });
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : 'メッシュ生成に失敗しました',
				name: error instanceof Error ? error.name : undefined
			} satisfies ChunkMeshResponse
		);
	}
};
