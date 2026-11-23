import { MapRenderer, type StyleSpecification } from '@ml2drender/wasm';
import wasmUrl from '@ml2drender/wasm/renderer.wasm?url';
import type { ThumbnailRequest, ThumbnailResource, ThumbnailResourceResponse } from './thumbnail';
import { thumbnailMltToMvt } from './thumbnail-mlt';

let wasm: WebAssembly.Module | undefined;

let nextResourceId = 0;
const resources = new Map<
	number,
	{ resolve: (resource: ThumbnailResource) => void; reject: (error: Error) => void; }
>();

const loadResource = async (url: string): Promise<Uint8Array<ArrayBuffer> | null> => {
	const id = nextResourceId++;
	const resource = await new Promise<ThumbnailResource>((resolve, reject) => {
		resources.set(id, { resolve, reject });
		postMessage({ type: 'resource', id, url });
	});
	return resource.encoding === 'mlt' && resource.bytes
		? thumbnailMltToMvt(resource.bytes)
		: resource.bytes;
};

onmessage = async ({ data }: MessageEvent<ThumbnailRequest | ThumbnailResourceResponse>) => {
	if ('type' in data) {
		const resource = resources.get(data.id);
		resources.delete(data.id);
		if ('error' in data) resource?.reject(new Error(data.error));
		else resource?.resolve(data);
		return;
	}
	try {
		if (!wasm) {
			// 依存最適化後のimport.meta.urlに依存せず、Viteが解決したアセットURLを使う。
			const response = await fetch(wasmUrl);
			if (!response.ok) throw new Error(`Thumbnail WASM HTTP ${response.status}: ${wasmUrl}`);
			wasm = await WebAssembly.compile(await response.arrayBuffer());
		}
		const renderer = await MapRenderer.init(JSON.parse(data.styleJson) as StyleSpecification, {
			wasm,
			// 画像ごとにデコード済みデータを解放し、WASMインスタンスは共有する。
			cache: { ttlMs: 0 },
			loadResource
		});
		const image = await renderer.renderView(data.view);
		postMessage({ blob: new Blob([image.toWebp()], { type: 'image/webp' }) });
	} catch (error) {
		postMessage({ error: error instanceof Error ? error.message : String(error) });
	}
};
