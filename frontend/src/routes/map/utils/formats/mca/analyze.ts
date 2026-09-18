import type { McaOptions, McaProgress, McaResult } from './types';
import type { McaWorkerResponse } from './worker';
import McaWorker from './worker?worker';

const convertInWorker = (
	input: { file: File; } | { files: File[]; },
	options: McaOptions,
	signal: AbortSignal,
	onProgress?: (progress: McaProgress) => void
): Promise<McaResult> =>
	new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('読み込みをキャンセルしました', 'AbortError'));
			return;
		}
		const worker = new McaWorker();
		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('読み込みをキャンセルしました', 'AbortError'));
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<McaWorkerResponse>) => {
			if ('progress' in data) {
				onProgress?.(data.progress);
				return;
			}
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = (event) => {
			cleanup();
			reject(new Error(`MCA読み込みに失敗しました: ${event.message}`));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('MCAの変換結果を受け取れませんでした'));
		};
		try {
			worker.postMessage({ ...input, options });
		} catch (error) {
			cleanup();
			reject(error);
		}
	});

export const mcaFileToGlbInWorker = (
	file: File,
	options: McaOptions,
	signal: AbortSignal,
	onProgress?: (progress: McaProgress) => void
): Promise<McaResult> => convertInWorker({ file }, options, signal, onProgress);

export const mcaFilesToGlbInWorker = (
	files: File[],
	options: McaOptions,
	signal: AbortSignal,
	onProgress?: (progress: McaProgress) => void
): Promise<McaResult> =>
	// Svelteの配列Proxyはstructured cloneできないため、通常の配列へコピーする。
	convertInWorker({ files: [...files] }, options, signal, onProgress);
