import { base } from '$app/paths';
import * as publicEnv from '$env/static/public';
import type { RobloxResponse, RobloxResult } from './worker';
import RobloxWorker from './worker?worker';

export const robloxFileToGlbInWorker = (file: File, signal: AbortSignal): Promise<RobloxResult> =>
	new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		const worker = new RobloxWorker();
		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener('abort', abort);
		};
		const abort = () => {
			cleanup();
			reject(new DOMException('Aborted', 'AbortError'));
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<RobloxResponse>) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = event => {
			cleanup();
			reject(new Error(event.message || 'ワールドの読み込みに失敗しました。'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('ワールドの変換結果を受け取れませんでした。'));
		};
		try {
			const values: Record<string, string> = publicEnv;
			worker.postMessage({
				file,
				resourceUrl: values.PUBLIC_ROBLOX_RESOURCE_URL?.trim() || `${base}/roblox`,
				assetApiUrl: values.PUBLIC_ROBLOX_ASSET_API_URL?.trim() || undefined
			});
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
