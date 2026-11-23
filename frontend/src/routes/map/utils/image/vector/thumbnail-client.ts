import type { StyleSpecification } from '$routes/map/utils/maplibre';
import { hasWorkerError, type WorkerErrorResponse } from '$routes/map/utils/worker/run-single-shot';
import {
	createThumbnailStyle,
	createThumbnailView,
	type ThumbnailRequest,
	type ThumbnailResourceRequest
} from './thumbnail';
import { createThumbnailResourceLoader } from './thumbnail-resource';
import ThumbnailWorker from './thumbnail.worker?worker';

let worker: Worker | undefined;
let queue: Promise<unknown> = Promise.resolve();

const renderThumbnail = (request: ThumbnailRequest): Promise<Blob> => {
	const currentWorker = worker ??= new ThumbnailWorker();
	return new Promise((resolve, reject) => {
		const controller = new AbortController();
		const loadResource = createThumbnailResourceLoader(
			JSON.parse(request.styleJson),
			request.baseUrl
		);
		const cleanup = () => {
			controller.abort();
			clearTimeout(timer);
			currentWorker.onmessage = null;
			currentWorker.onerror = null;
			currentWorker.onmessageerror = null;
		};
		const fail = (error: Error) => {
			cleanup();
			currentWorker.terminate();
			worker = undefined;
			reject(error);
		};
		// WASMの初回取得も含めて制限し、失敗したジョブが後続を止めないようにする。
		const timer = setTimeout(
			() => fail(new Error('サムネイル生成がタイムアウトしました')),
			30_000
		);
		currentWorker.onmessage = (
			{ data }: MessageEvent<{ blob: Blob; } | WorkerErrorResponse | ThumbnailResourceRequest>
		) => {
			if ('type' in data) {
				void loadResource(data.url, controller).then(resource => {
					if (controller.signal.aborted) return;
					currentWorker.postMessage(
						{ type: 'resource', id: data.id, ...resource },
						resource.bytes ? [resource.bytes.buffer] : []
					);
				}).catch(error => {
					if (controller.signal.aborted) return;
					currentWorker.postMessage({
						type: 'resource',
						id: data.id,
						error: error instanceof Error ? error.message : String(error)
					});
				});
				return;
			}
			if (hasWorkerError(data)) {
				fail(new Error(data.error));
				return;
			}
			cleanup();
			resolve(data.blob);
		};
		currentWorker.onerror = event => fail(new Error(event.message));
		currentWorker.onmessageerror = () => fail(new Error('サムネイルの受信に失敗しました'));
		try {
			currentWorker.postMessage(request);
		} catch (error) {
			fail(error instanceof Error ? error : new Error(String(error)));
		}
	});
};

export const generateVectorThumbnail = (
	style: StyleSpecification,
	bounds: [number, number, number, number]
): Promise<string> => {
	const request: ThumbnailRequest = {
		// SvelteのProxyをWorkerへ送らず、呼び出し時のスタイルを固定する。
		styleJson: JSON.stringify(createThumbnailStyle(style)),
		view: createThumbnailView(bounds),
		baseUrl: document.baseURI
	};
	const result = queue.then(() => renderThumbnail(request));
	queue = result.catch(() => undefined);
	return result.then(blob => URL.createObjectURL(blob));
};
