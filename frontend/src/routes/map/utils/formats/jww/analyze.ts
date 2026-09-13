import type { JwwParseResult } from '.';
import type { JwwWorkerResponse } from './worker';
import JwwWorker from './worker?worker';

export const analyzeJwwFileInWorker = async (
	file: File,
	signal: AbortSignal
): Promise<JwwParseResult> => {
	const buffer = await file.arrayBuffer();
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('読み込みを中止しました', 'AbortError'));
			return;
		}
		const worker = new JwwWorker();
		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('読み込みを中止しました', 'AbortError'));
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<JwwWorkerResponse>) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = (event) => {
			cleanup();
			reject(new Error(`JWWの読み込みに失敗しました: ${event.message}`));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('JWWの解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(buffer, [buffer]);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};
