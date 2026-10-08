import type { DxfUnit } from '$routes/map/utils/formats/dxf';
import { analyzeDwgDrawing, type DwgDrawingResult, normalizeDwgDrawing } from '.';
import { dwgConversionError, type DwgReadOptions } from './acis';
import { formatDwg } from './definition';
import { loadDwgRuntime } from './runtime';

type PreparedDwg = import('../../../../../../static/vendor/dwg-acis/dwg_acis.js').PreparedDwg;
export type DwgWorkerRequest = {
	arrayBuffer: ArrayBuffer;
	unit?: DxfUnit;
	options?: DwgReadOptions;
} | { index: number; slot: number; };
export type DwgWorkerResponse =
	| { result: DwgDrawingResult; }
	| { prepared: DwgDrawingResult; jobCount: number; }
	| { job: Uint8Array<ArrayBuffer>; index: number; slot: number; }
	| { error: string; };

let prepared: PreparedDwg | undefined;
self.onmessage = async ({ data }: MessageEvent<DwgWorkerRequest>) => {
	try {
		if ('index' in data) {
			if (!prepared) throw new Error('DWGの変換準備が完了していません');
			// wasm-bindgen returns a copy backed by an ordinary ArrayBuffer.
			const job = prepared.next_job() as Uint8Array<ArrayBuffer>;
			(self as unknown as Worker).postMessage({ job, ...data } satisfies DwgWorkerResponse, [
				job.buffer
			]);
			if (!prepared.job_count()) {
				prepared.free();
				prepared = undefined;
			}
			return;
		}
		if (data.options?.mode === 'inspect') {
			const result = await analyzeDwgDrawing(data.arrayBuffer, data.unit, data.options);
			postMessage({ result } satisfies DwgWorkerResponse);
			return;
		}
		if (data.arrayBuffer.byteLength > formatDwg.limits.maxFileBytes) {
			throw new Error('DWGの読み込み上限は128 MiBです。図面を分割してください。');
		}
		const runtime = await loadDwgRuntime();
		prepared = runtime.prepare_dwg(
			new Uint8Array(data.arrayBuffer),
			JSON.stringify(data.options?.layers ?? null)
		);
		const result = normalizeDwgDrawing(JSON.parse(prepared.drawing()), data.unit ?? 'auto');
		postMessage(
			{ prepared: result, jobCount: prepared.job_count() } satisfies DwgWorkerResponse
		);
	} catch (error) {
		prepared?.free();
		prepared = undefined;
		postMessage({ error: dwgConversionError(error).message } satisfies DwgWorkerResponse);
	}
};
