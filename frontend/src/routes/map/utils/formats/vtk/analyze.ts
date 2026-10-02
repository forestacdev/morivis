import { formatVtk } from './definition';
import { checkVtkFileSize } from './numeric';
import type { VtkRenderOptions, VtkSummary } from './types';
import type { VtkRequest, VtkResponse } from './worker';
import VtkWorker from './worker?worker';

const runVtkWorker = (request: VtkRequest, signal: AbortSignal): Promise<VtkResponse> => {
	signal.throwIfAborted();
	checkVtkFileSize(request.file.size);
	return new Promise((resolve, reject) => {
		const worker = new VtkWorker();
		const cleanup = () => {
			worker.terminate();
			clearTimeout(timer);
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(signal.reason);
		};
		const timer = setTimeout(() => {
			cleanup();
			reject(new Error('VTKの解析が時間内に完了しませんでした。データを分割してください'));
		}, formatVtk.limits.timeoutMs);
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<VtkResponse>) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data);
		};
		worker.onerror = event => {
			cleanup();
			reject(new Error(event.message || 'VTKの解析処理を実行できませんでした'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('VTKの解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(request);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};

export const inspectVtkFileInWorker = async (
	file: File,
	signal: AbortSignal
): Promise<VtkSummary> => {
	const response = await runVtkWorker({ file }, signal);
	if (!('summary' in response)) throw new Error('VTKの解析結果が不正です');
	return response.summary;
};

export const vtkFileToGlbInWorker = async (
	file: File,
	options: VtkRenderOptions,
	signal: AbortSignal
): Promise<ArrayBuffer> => {
	const response = await runVtkWorker({ file, options }, signal);
	if (!('glb' in response)) throw new Error('VTKの変換結果が不正です');
	return response.glb;
};
