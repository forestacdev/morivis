import type { FeatureCollection } from '$routes/map/types/geojson';
import type { CedxmRequest, CedxmResponse } from './worker';
import CedxmWorker from './worker?worker';

const run = (request: CedxmRequest, signal: AbortSignal): Promise<CedxmResponse> =>
	new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('読み込みを中止しました', 'AbortError'));
			return;
		}
		const worker = new CedxmWorker();
		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('読み込みを中止しました', 'AbortError'));
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<CedxmResponse | { error: string; }>) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data);
		};
		worker.onerror = (event) => {
			cleanup();
			reject(new Error(`CEDXMの変換に失敗しました: ${event.message}`));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('CEDXMの変換結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(request, request.type === 'parse' ? [request.buffer] : []);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
export const analyzeCedxmFileInWorker = async (file: File, signal: AbortSignal) => {
	const result = await run({ type: 'parse', buffer: await file.arrayBuffer() }, signal);
	if (!('result' in result)) throw new Error('CEDXMの解析結果が不正です');
	return result.result;
};
export const cedxmModelToGlbInWorker = async (geojson: FeatureCollection, signal: AbortSignal) => {
	const result = await run({ type: 'mesh', geojson }, signal);
	if (!('glb' in result)) throw new Error('CEDXMのモデル変換結果が不正です');
	return result.glb;
};
