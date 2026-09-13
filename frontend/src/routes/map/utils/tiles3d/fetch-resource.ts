import { fetchLocalTilesetResource, isLocalTilesetUrl } from './local-files';

/** Content-Encodingが欠けたgzip配信も、本文の先頭で判別してストリーム展開する。 */
export const decodeTilesetResponse = async (response: Response): Promise<Response> => {
	if (!response.ok || !response.body) return response;
	const reader = response.body.getReader();
	const chunks: Uint8Array<ArrayBuffer>[] = [];
	const signature: number[] = [];
	try {
		while (signature.length < 2) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
			for (const byte of value) {
				if (signature.length === 2) break;
				signature.push(byte);
			}
		}
	} catch (error) {
		reader.releaseLock();
		throw error;
	}
	const body = new ReadableStream<Uint8Array<ArrayBuffer>>({
		start: (controller) => {
			for (const chunk of chunks) controller.enqueue(chunk);
			chunks.length = 0;
		},
		pull: async (controller) => {
			try {
				const { done, value } = await reader.read();
				if (done) {
					reader.releaseLock();
					controller.close();
				} else {
					controller.enqueue(value);
				}
			} catch (error) {
				reader.releaseLock();
				controller.error(error);
			}
		},
		cancel: async (reason) => {
			try {
				await reader.cancel(reason);
			} finally {
				reader.releaseLock();
			}
		}
	});
	const isGzip = signature[0] === 0x1f && signature[1] === 0x8b;
	const headers = new Headers(response.headers);
	if (isGzip) {
		headers.delete('Content-Encoding');
		headers.delete('Content-Length');
	}
	const decoded = new Response(
		isGzip ? body.pipeThrough(new DecompressionStream('gzip')) : body,
		{
			status: response.status,
			statusText: response.statusText,
			headers
		}
	);
	// loaders.glはresponse.urlを子タイルやテクスチャの相対URL解決に使う。
	Object.defineProperty(decoded, 'url', { value: response.url });
	return decoded;
};

export const fetchTilesetResource = async (url: string, init?: RequestInit): Promise<Response> => {
	const response = await fetchLocalTilesetResource(url, init);
	return isLocalTilesetUrl(url) ? response : decodeTilesetResponse(response);
};
