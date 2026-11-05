import { emptyRasterTile } from '$routes/map/protocol/raster/local-tiles';
import { addProtocol, removeProtocol } from '$routes/map/utils/maplibre';
import { type indexPreviewRegions, MCA_PREVIEW_ZOOM } from './preview-map';
import type { McaTileResponse } from './surface-tile.worker';

let nextId = 0;

/** ダイアログごとに登録し、表示範囲から届いた要求だけを順番に展開する。 */
export const registerPreviewTiles = (
	regions: ReturnType<typeof indexPreviewRegions>,
	cache: Map<File, Blob>,
	onError: (file: File, message: string) => void
) => {
	const protocol = `mca-preview-${++nextId}`;
	const lifetime = new AbortController();
	const failed = new Set<File>();
	let queue = Promise.resolve();
	let worker: Worker | undefined;

	const generate = (file: File, signal: AbortSignal) =>
		new Promise<McaTileResponse>((resolve, reject) => {
			worker ??= new Worker(new URL('./surface-tile.worker.ts', import.meta.url), {
				type: 'module'
			});
			const abort = () => {
				worker?.terminate();
				worker = undefined;
				reject(signal.reason);
			};
			signal.addEventListener('abort', abort, { once: true });
			worker.onmessage = ({ data }: MessageEvent<McaTileResponse>) => {
				signal.removeEventListener('abort', abort);
				resolve(data);
			};
			worker.onerror = () => {
				signal.removeEventListener('abort', abort);
				worker?.terminate();
				worker = undefined;
				resolve({ error: '地表画像を生成できません' });
			};
			worker.postMessage(file);
		});

	addProtocol(protocol, ({ url }, controller) => {
		const [, zoom, x, y] = new URL(url).pathname.split('/');
		const entry = regions.get(`${x}/${y}`);
		if (Number(zoom) !== MCA_PREVIEW_ZOOM || entry?.files.length !== 1) {
			return Promise.resolve({ data: emptyRasterTile() });
		}
		const file = entry.files[0];
		const signal = AbortSignal.any([lifetime.signal, controller.signal]);
		const request = queue.then(async () => {
			signal.throwIfAborted();
			if (failed.has(file)) return { data: emptyRasterTile() };
			let image = cache.get(file);
			if (!image) {
				const result = await generate(file, signal);
				signal.throwIfAborted();
				if ('error' in result) {
					failed.add(file);
					onError(file, result.error);
					return { data: emptyRasterTile() };
				}
				image = result.image;
			}
			cache.delete(file);
			cache.set(file, image);
			if (cache.size > 64) cache.delete(cache.keys().next().value!);
			return { data: await image.arrayBuffer() };
		});
		queue = request.then(() => {}, () => {});
		return request;
	});
	return {
		protocol,
		dispose: () => {
			lifetime.abort();
			worker?.terminate();
			removeProtocol(protocol);
		}
	};
};
