import type { GifConversionResponse } from './convert.worker';
import { formatGif } from './definition';

/** 1回限りのWorkerに変換を閉じ込め、成功・失敗・中断のいずれでもWASMのメモリを解放する。 */
export const convertGifToVideo = (file: File, signal: AbortSignal): Promise<File> => {
	signal.throwIfAborted();
	if (!file.size) throw new Error('GIFファイルが空です');
	if (file.size > formatGif.limits.maxFileBytes) throw new Error('GIFは32 MiB以下にしてください');
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./convert.worker.ts', import.meta.url), {
			type: 'module'
		});
		const cleanup = () => {
			clearTimeout(timer);
			signal.removeEventListener('abort', abort);
			worker.terminate();
		};
		const fail = (error: Error) => {
			cleanup();
			reject(error);
		};
		const abort = () => fail(new DOMException('Aborted', 'AbortError'));
		const timer = setTimeout(
			() => fail(new Error('GIFの変換が時間内に完了しませんでした')),
			formatGif.limits.timeoutMs
		);
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<GifConversionResponse>) => {
			if ('error' in data) {
				fail(new Error(data.error));
				return;
			}
			cleanup();
			resolve(
				new File([data.result], file.name.replace(/\.gif$/i, '') + '.mp4', {
					type: 'video/mp4'
				})
			);
		};
		worker.onerror = () =>
			fail(new Error('GIF変換処理を読み込めませんでした。再度お試しください'));
		worker.onmessageerror = () => fail(new Error('GIF変換結果を受け取れませんでした'));
		try {
			worker.postMessage(file);
		} catch (cause) {
			fail(cause instanceof Error ? cause : new Error('GIFを読み込めませんでした'));
		}
	});
};
