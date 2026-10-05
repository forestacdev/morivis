import type { FeatureCollection } from '$routes/map/types/geojson';
import type { DxfUnit } from '$routes/map/utils/formats/dxf';
import type { DwgDrawingResult } from '.';

import type { Feature } from '$routes/map/types/geojson';
import { indexedCadMeshToFeature } from '../dxf/indexed-mesh';
import type { DwgReadOptions } from './acis';
import { formatDwg } from './definition';
import type { DwgSolidRequest, DwgSolidResponse, DwgSolidResult } from './solid.worker';
import SolidWorker from './solid.worker?worker';
import type { DwgWorkerResponse } from './worker';
import DwgWorker from './worker?worker';

const analyzeDwgArrayBufferInWorker = (
	arrayBuffer: ArrayBuffer,
	unit: DxfUnit = 'auto',
	signal?: AbortSignal,
	options?: DwgReadOptions
): Promise<DwgDrawingResult> =>
	new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new DOMException('変換を中止しました', 'AbortError'));
			return;
		}
		const workers = new Set<Worker>();
		const meshWorkers: Worker[] = [];
		const results: DwgSolidResult[] = [];
		let drawing: DwgDrawingResult;
		let next = 0, completed = 0, jobCount = 0;
		let settled = false;
		const stop = (worker: Worker) => {
			if (workers.delete(worker)) worker.terminate();
		};
		const cleanup = () => {
			for (const worker of workers) stop(worker);
			signal?.removeEventListener('abort', abort);
		};
		const fail = (error: unknown) => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(error instanceof Error ? error : new Error(String(error)));
		};
		const finish = (result: DwgDrawingResult) => {
			if (settled) return;
			settled = true;
			cleanup();
			resolve(result);
		};
		const abort = () => fail(new DOMException('変換を中止しました', 'AbortError'));
		signal?.addEventListener('abort', abort, { once: true });
		const watch = (worker: Worker) => {
			workers.add(worker);
			worker.onerror = error => {
				const detail = typeof error.message === 'string' ? error.message.trim() : '';
				fail(
					new Error(
						detail
							? `DWGの変換に失敗しました: ${detail}`
							: 'DWGの変換処理を実行できませんでした。変換モジュールの読み込み失敗、またはWorkerの異常終了が発生しています。'
					)
				);
			};
			worker.onmessageerror = () => fail(new Error('DWGの変換結果を受け取れませんでした。'));
			return worker;
		};
		try {
			const reader = watch(new DwgWorker());
			const dispatch = (slot: number) => {
				if (settled) return;
				if (next >= jobCount) {
					stop(meshWorkers[slot]);
					return;
				}
				reader.postMessage({ index: next++, slot });
			};
			reader.onmessage = ({ data }: MessageEvent<DwgWorkerResponse>) => {
				if (settled) return;
				try {
					if ('error' in data) return fail(new Error(data.error));
					if ('result' in data) return finish(data.result);
					if ('prepared' in data) {
						drawing = data.prepared;
						jobCount = data.jobCount;
						if (!jobCount) return finish(drawing);
						for (let slot = 0; slot < Math.min(4, jobCount); slot++) {
							meshWorkers.push(watch(new SolidWorker()));
							dispatch(slot);
						}
						return;
					}
					const { job, index, slot } = data;
					const worker = meshWorkers[slot];
					worker.onmessage = ({ data }: MessageEvent<DwgSolidResponse>) => {
						if (settled) return;
						try {
							if ('error' in data) return fail(new Error(data.error));
							results[index] = data.result;
							if (++completed === jobCount) {
								finish({
									...drawing,
									solids: results.flatMap(result => result.solids),
									skippedSolids: results.flatMap(result => result.skippedSolids)
								});
							} else dispatch(slot);
						} catch (error) {
							fail(error);
						}
					};
					worker.postMessage(
						{ job, metersPerUnit: drawing.metersPerUnit } satisfies DwgSolidRequest,
						[job.buffer]
					);
					// All raw jobs have left the reader. Release its document/WASM memory now.
					if (index === jobCount - 1) stop(reader);
				} catch (error) {
					fail(error);
				}
			};
			reader.postMessage({ arrayBuffer, unit, options }, [arrayBuffer]);
		} catch (error) {
			fail(error);
		}
	});

export const analyzeDwgFileInWorker = async (
	file: File,
	unit: DxfUnit = 'auto',
	signal?: AbortSignal,
	options?: DwgReadOptions
) => {
	if (file.size > formatDwg.limits.maxFileBytes) {
		throw new Error('DWGの読み込み上限は128 MiBです。図面を分割してください。');
	}
	return analyzeDwgArrayBufferInWorker(await file.arrayBuffer(), unit, signal, options);
};

const drawingToGeoJson = (drawing: DwgDrawingResult): FeatureCollection => ({
	...drawing.geojson,
	features: [
		...drawing.geojson.features,
		...drawing.solids.map(solid => indexedCadMeshToFeature(solid) as unknown as Feature)
	]
});
export const dwgArrayBufferToGeoJsonInWorker = async (
	arrayBuffer: ArrayBuffer
): Promise<FeatureCollection> => drawingToGeoJson(await analyzeDwgArrayBufferInWorker(arrayBuffer));
export const dwgFileToGeoJsonInWorker = async (file: File): Promise<FeatureCollection> =>
	drawingToGeoJson(await analyzeDwgFileInWorker(file));
