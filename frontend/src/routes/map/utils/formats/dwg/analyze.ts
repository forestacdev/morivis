import type { FeatureCollection } from '$routes/map/types/geojson';
import type { DxfUnit } from '$routes/map/utils/formats/dxf';
import { hasWorkerError } from '$routes/map/utils/worker/run-single-shot';
import type { DwgDrawingResult } from '.';

import type { Feature } from '$routes/map/types/geojson';
import { indexedCadMeshToFeature } from '../dxf/indexed-mesh';
import type { DwgReadOptions } from './acis';
import { formatDwg } from './definition';
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
		const worker = new DwgWorker();
		const cleanup = () => {
			worker.terminate();
			signal?.removeEventListener('abort', abort);
		};
		const fail = (error: Error) => {
			cleanup();
			reject(error);
		};
		const abort = () => fail(new DOMException('変換を中止しました', 'AbortError'));
		signal?.addEventListener('abort', abort, { once: true });
		worker.onmessage = ({ data }: MessageEvent<DwgWorkerResponse>) => {
			cleanup();
			if (hasWorkerError(data)) reject(new Error(data.error));
			else resolve(data.result);
		};
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
		try {
			worker.postMessage({ arrayBuffer, unit, options }, [arrayBuffer]);
		} catch (error) {
			fail(error instanceof Error ? error : new Error(String(error)));
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
