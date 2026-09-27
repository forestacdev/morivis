import initGdalJs from 'gdal3.js';
import dataUrl from 'gdal3.js/dist/package/gdal3WebAssembly.data?url';
import wasmUrl from 'gdal3.js/dist/package/gdal3WebAssembly.wasm?url';
import type { MapInfoResult } from '.';
import { convertMapInfoTab } from './convert';

export interface MapInfoRequest {
	files: File[];
	sourceCrs?: string;
}
export type MapInfoResponse = { result: MapInfoResult; } | { error: string; };

self.onmessage = async ({ data }: MessageEvent<MapInfoRequest>) => {
	try {
		const gdal = await initGdalJs({
			useWorker: false,
			paths: { wasm: wasmUrl, data: dataUrl },
			env: { PROJ_NETWORK: 'OFF' },
			logHandler: () => {},
			errorHandler: () => {}
		});
		const result = await convertMapInfoTab(gdal, data.files, data.sourceCrs);
		postMessage({ result } satisfies MapInfoResponse);
	} catch (error) {
		const message = error instanceof Error
			? error.message
			: typeof error === 'string'
			? error
			: 'MapInfo TABの読み込みに失敗しました。ファイル一式と形式を確認してください';
		postMessage({ error: message } satisfies MapInfoResponse);
	}
};
