import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McaChunkMeshPool } from './chunk-mesh-pool';
import type { ChunkMeshRequest, ChunkMeshResponse } from './chunk-mesh.worker';
import { meshMcaRegion } from './mesh';
import { type McaRegion, sectionKey } from './types';

const state = vi.hoisted(() => ({
	workers: [] as {
		postMessage: ReturnType<typeof vi.fn>;
		terminate: ReturnType<typeof vi.fn>;
		onmessage?: (event: { data: ChunkMeshResponse; }) => void;
		onerror?: (event: { message: string; }) => void;
	}[]
}));
vi.mock('./chunk-mesh.worker?worker', () => ({
	default: class {
		postMessage = vi.fn();
		terminate = vi.fn();
		constructor() {
			state.workers.push(this);
		}
	}
}));
beforeEach(() => {
	state.workers.length = 0;
});
const region = (): McaRegion => ({
	sections: new Map(
		Array.from({ length: 8 }, (_, x) => [sectionKey(x, 0, 0), { x, y: 0, z: 0, blocks: 1 }])
	),
	palette: ['minecraft:air', 'test:solid'],
	chunkCount: 8,
	blockCount: 32768,
	dataVersions: []
});
const finish = (index: number) => {
	const worker = state.workers[index];
	const job = worker.postMessage.mock.lastCall![0] as ChunkMeshRequest;
	worker.onmessage?.({
		data: { mesh: meshMcaRegion(job.region, undefined, Infinity, job.ownedSections) }
	});
};

describe('MCA chunk worker pool', () => {
	it('4つの処理を同時に開始し、完了順に依存せず結果と進捗を集約して再利用する', async () => {
		const pool = new McaChunkMeshPool(), progress = vi.fn();
		const pending = pool.mesh(region(), undefined, Infinity, progress);
		expect(state.workers).toHaveLength(4);
		finish(3);
		expect(state.workers.map((w) => w.postMessage.mock.calls.length)).toEqual([1, 1, 1, 2]);
		// 遅いWorkerを待たず、空いたWorkerが次の4チャンクを処理する。
		for (const index of [3, 3, 3, 3, 1, 0, 2]) finish(index);
		const meshes = await pending;
		expect(meshes.reduce((sum, m) => sum + m.faceCount, 0)).toBe(
			meshMcaRegion(region()).faceCount
		);
		expect(progress.mock.calls.map(([p]) => p.completed)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
		const next = pool.mesh(region(), undefined, Infinity);
		expect(state.workers).toHaveLength(4);
		for (let i = 0; i < 8; i++) finish(i % 4);
		await next;
		pool.dispose();
		expect(state.workers.every((w) => w.terminate.mock.calls.length === 1)).toBe(true);
	});
	it('各分割が上限内でも合計面数が上限を超えたら全Workerを停止する', async () => {
		const pool = new McaChunkMeshPool();
		const pending = pool.mesh(region(), undefined, 20);
		for (let i = 0; i < 8; i++) finish(i % 4);
		await expect(pending).rejects.toMatchObject({ name: 'McaFaceLimitError' });
		expect(state.workers.every((w) => w.terminate.mock.calls.length === 1)).toBe(true);
	});
	it('一部のWorkerが失敗したときも全体を止める', async () => {
		const pool = new McaChunkMeshPool();
		const pending = pool.mesh(region(), undefined, Infinity);
		state.workers[1].onerror?.({ message: 'test-error' });
		await expect(pending).rejects.toThrow('test-error');
		expect(state.workers.every((w) => w.terminate.mock.calls.length === 1)).toBe(true);
	});
	it('中断時に待機中の仕事を送らず全Workerを終了する', async () => {
		const pool = new McaChunkMeshPool();
		const pending = pool.mesh(region(), undefined, Infinity);
		pool.dispose();
		await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
		expect(
			state.workers.every((w) =>
				w.postMessage.mock.calls.length === 1 && w.terminate.mock.calls.length === 1
			)
		).toBe(true);
	});
});
