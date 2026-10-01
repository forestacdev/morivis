import * as runtime from 'web-e57-internal/e57_bg.js';
import wasmUrl from 'web-e57-internal/e57_bg.wasm?url';
import type { PointCloudUpAxis } from '../pointcloud/axis';
import { type E57Result, parseE57, validateE57Size } from '.';

export type E57Request = { file: File; upAxis: PointCloudUpAxis; };
export type E57Response = { result: E57Result; } | { error: string; };
self.onmessage = async ({ data: { file, upAxis } }: MessageEvent<E57Request>) => {
	try {
		validateE57Size(file.size);
		const response = await fetch(wasmUrl);
		if (!response.ok) throw new Error('E57読み込みモジュールを取得できませんでした');
		const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), {
			'./e57_bg.js': runtime
		});
		runtime.__wbg_set_wasm(instance.exports);
		const result = parseE57(
			new Uint8Array(await file.arrayBuffer()),
			runtime.convertE57,
			undefined,
			upAxis
		);
		const transfer: Transferable[] = [result.positions.buffer];
		if (result.colors) transfer.push(result.colors.buffer);
		(self as unknown as Worker).postMessage({ result } satisfies E57Response, transfer);
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : String(cause);
		postMessage({ error: `E57を読み込めませんでした: ${message}` } satisfies E57Response);
	}
};
