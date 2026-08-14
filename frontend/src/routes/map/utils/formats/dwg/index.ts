import { convertDwgToDxf, init } from 'dwgdxf';

import type { FeatureCollection } from '$routes/map/types/geojson';
import { dxfArrayBufferToGeoJson } from '$routes/map/utils/formats/dxf';
import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';

let dwgdxfInitPromise: Promise<void> | null = null;

const toExactArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer;
};

const ensureDwgDxfRuntime = async (): Promise<void> => {
	if (!dwgdxfInitPromise) {
		// `dwgdxf` の相対 `./wasm` 解決は本番ビルドで資産が残らないため、static 配下を明示する。
		dwgdxfInitPromise = init({
			wasmBase: resolveStaticAssetPath('/vendor/dwgdxf')
		});
	}

	await dwgdxfInitPromise;
};

export const convertDwgArrayBufferToDxfArrayBuffer = async (
	arrayBuffer: ArrayBuffer
): Promise<ArrayBuffer> => {
	await ensureDwgDxfRuntime();
	const dxfBytes = await convertDwgToDxf(new Uint8Array(arrayBuffer));
	return toExactArrayBuffer(dxfBytes);
};

export const dwgArrayBufferToGeoJson = async (
	arrayBuffer: ArrayBuffer
): Promise<FeatureCollection> => {
	const dxfArrayBuffer = await convertDwgArrayBufferToDxfArrayBuffer(arrayBuffer);
	return dxfArrayBufferToGeoJson(dxfArrayBuffer);
};

export const dwgFileToGeoJsonBrowser = async (file: File): Promise<FeatureCollection> =>
	dwgArrayBufferToGeoJson(await file.arrayBuffer());
