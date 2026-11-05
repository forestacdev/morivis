import { emptyRasterTile } from '$routes/map/protocol/raster/local-tiles';
import { addProtocol, removeProtocol } from '$routes/map/utils/maplibre';
import { type indexPreviewRegions, MCA_PREVIEW_ZOOM } from './preview-map';
import type { McaTileResponse } from './surface-tile.worker';

interface PreviewSlot {
	file?: File;
	worker?: Worker;
}

let nextId = 0;

const generate = (slot: PreviewSlot, file: File, signal: AbortSignal) =>
	new Promise<McaTileResponse>((resolve, reject) => {
		const worker = slot.worker ??= new Worker(
			new URL('./surface-tile.worker.ts', import.meta.url),
			{
				type: 'module'
			}
		);
		const stop = () => {
			worker.terminate();
			slot.worker = undefined;
		};
		const abort = () => {
			stop();
			reject(signal.reason);
		};
		const failed = () => {
			signal.removeEventListener('abort', abort);
			stop();
			resolve({ error: '地表画像を生成できません' });
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<McaTileResponse>) => {
			signal.removeEventListener('abort', abort);
			resolve(data);
		};
		worker.onerror = failed;
		worker.onmessageerror = failed;
		try {
			worker.postMessage(file);
		} catch {
			failed();
		}
	});

/** 表示範囲からの要求に応じてWorkerを起動し、最大4リージョンを並列に展開する。 */
export const registerPreviewTiles = (
	regions: ReturnType<typeof indexPreviewRegions>,
	cache: Map<File, Blob>,
	onError: (file: File, message: string) => void
) => {
	const protocol = `mca-preview-${++nextId}`;
	const lifetime = new AbortController();
	const failed = new Set<File>();
	const slots: PreviewSlot[] = Array.from({ length: 4 }, () => ({}));
	const waiting = new Set<() => void>();

	const acquire = (file: File, signal: AbortSignal) =>
		new Promise<PreviewSlot>((resolve, reject) => {
			const abort = () => {
				waiting.delete(resume);
				reject(signal.reason);
			};
			const resume = () => {
				// 同じ画像を要求されたら最初の生成を待ち、解放後にキャッシュを使う。
				if (slots.some(slot => slot.file === file)) return;
				const slot = slots.find(slot => !slot.file);
				if (!slot) return;
				slot.file = file;
				waiting.delete(resume);
				signal.removeEventListener('abort', abort);
				resolve(slot);
			};
			waiting.add(resume);
			signal.addEventListener('abort', abort, { once: true });
			resume();
		});

	const readCached = (file: File) => {
		const image = cache.get(file);
		if (!image) return;
		cache.delete(file);
		cache.set(file, image);
		return image;
	};

	addProtocol(protocol, async ({ url }, controller) => {
		const signal = AbortSignal.any([lifetime.signal, controller.signal]);
		signal.throwIfAborted();
		const [, zoom, x, y] = new URL(url).pathname.split('/');
		const entry = regions.get(`${x}/${y}`);
		if (Number(zoom) !== MCA_PREVIEW_ZOOM || entry?.files.length !== 1) {
			return { data: emptyRasterTile() };
		}
		const file = entry.files[0];
		if (failed.has(file)) return { data: emptyRasterTile() };
		const cached = readCached(file);
		if (cached) return { data: await cached.arrayBuffer() };
		const slot = await acquire(file, signal);
		try {
			signal.throwIfAborted();
			if (failed.has(file)) return { data: emptyRasterTile() };
			let image = readCached(file);
			if (!image) {
				const result = await generate(slot, file, signal);
				signal.throwIfAborted();
				if ('error' in result) {
					failed.add(file);
					onError(file, result.error);
					return { data: emptyRasterTile() };
				}
				image = result.image;
				cache.set(file, image);
				if (cache.size > 64) cache.delete(cache.keys().next().value!);
			}
			return { data: await image.arrayBuffer() };
		} finally {
			slot.file = undefined;
			for (const resume of waiting) resume();
		}
	});
	return {
		protocol,
		dispose: () => {
			lifetime.abort();
			for (const slot of slots) slot.worker?.terminate();
			removeProtocol(protocol);
		}
	};
};
