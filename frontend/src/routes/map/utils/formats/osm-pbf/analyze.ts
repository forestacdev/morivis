import type { FeatureCollection } from '$routes/map/types/geojson';
import { formatOsmPbf } from './definition';

import { MAX_OSM_PBF_BYTES } from './files';
import OsmPbfWorker from './worker?worker';

export const analyzeOsmPbf = (file: File, signal: AbortSignal): Promise<FeatureCollection> => {
	signal.throwIfAborted();
	if (file.size > MAX_OSM_PBF_BYTES) {
		throw new Error('OSM PBFは64 MiB以下に分割して読み込んでください');
	}
	return new Promise((resolve, reject) => {
		const worker = new OsmPbfWorker();
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
			reject(new Error('OSM PBFの解析が時間内に完了しませんでした。範囲を分割してください'));
		}, formatOsmPbf.limits.timeoutMs);
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = (
			{ data }: MessageEvent<{ result: FeatureCollection; } | { error: string; }>
		) => {
			cleanup();
			if ('error' in data) reject(new Error(data.error));
			else resolve(data.result);
		};
		worker.onerror = () => {
			cleanup();
			reject(new Error('OSM PBFの解析処理を実行できませんでした'));
		};
		worker.onmessageerror = () => {
			cleanup();
			reject(new Error('OSM PBFの解析結果を受け取れませんでした'));
		};
		try {
			worker.postMessage(file);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};
