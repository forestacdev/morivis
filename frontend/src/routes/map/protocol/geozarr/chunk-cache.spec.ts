import { describe, expect, it, vi } from 'vitest';
import { createChunkCache } from './chunk-cache';
describe('Zarrチャンク共有', () => {
	it('同じチャンクを共有し、一方の中断で他方を止めない', async () => {
		const cache = createChunkCache<Uint8Array>(8, value => value.byteLength);
		let finish!: (value: Uint8Array) => void;
		let signal!: AbortSignal;
		const load = vi.fn((s: AbortSignal) => {
			signal = s;
			return new Promise<Uint8Array>(resolve => {
				finish = resolve;
			});
		});
		const a = new AbortController(), b = new AbortController();
		const first = cache.get('test', load, a.signal), second = cache.get('test', load, b.signal);
		await Promise.resolve();
		a.abort();
		await expect(first).rejects.toMatchObject({ name: 'AbortError' });
		expect(signal.aborted).toBe(false);
		finish(new Uint8Array(4));
		await expect(second).resolves.toHaveLength(4);
		expect(load).toHaveBeenCalledOnce();
	});
	it('最後の利用者の中断を通信へ渡す', async () => {
		const cache = createChunkCache<Uint8Array>(8, value => value.byteLength);
		const controller = new AbortController();
		let shared!: AbortSignal;
		const promise = cache.get('test', signal =>
			new Promise((_resolve, reject) => {
				shared = signal;
				signal.addEventListener('abort', () => reject(signal.reason));
			}), controller.signal);
		await Promise.resolve();
		controller.abort();
		await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
		expect(shared.aborted).toBe(true);
	});
	it('容量を超えたら古いチャンクを除き、再取得する', async () => {
		const cache = createChunkCache<Uint8Array>(6, value => value.byteLength),
			signal = new AbortController().signal;
		const load = vi.fn(async () => new Uint8Array(4));
		await cache.get('test-a', load, signal);
		await cache.get('test-b', load, signal);
		expect(cache.bytes).toBe(4);
		await cache.get('test-a', load, signal);
		expect(load).toHaveBeenCalledTimes(3);
	});
});
