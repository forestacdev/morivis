import { convertDwgToDxf, init } from 'dwgdxf';

import type { FeatureCollection } from '$routes/map/types/geojson';
import { dxfArrayBufferToGeoJson } from '$routes/map/utils/formats/dxf';
import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';

let dwgdxfInitPromise: Promise<void> | null = null;
const ACIS_BINARY_SIGNATURE = new TextEncoder().encode('ACIS BinaryFile(');

const toExactArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer;
};

const includesAsciiSignature = (bytes: Uint8Array, signature: Uint8Array): boolean => {
	if (signature.length === 0 || bytes.length < signature.length) {
		return false;
	}

	outer: for (let i = 0; i <= bytes.length - signature.length; i += 1) {
		for (let j = 0; j < signature.length; j += 1) {
			if (bytes[i + j] !== signature[j]) {
				continue outer;
			}
		}

		return true;
	}

	return false;
};

export const detectUnsupportedDwgReason = (bytes: Uint8Array): string | null => {
	// 構造物モデル系 DWG では ACIS ソリッドがそのまま入っており、
	// `dwgdxf` が wasm trap の `unreachable` だけ返して落ちることがある。
	if (includesAsciiSignature(bytes, ACIS_BINARY_SIGNATURE)) {
		return 'この DWG は ACIS ソリッドを含む 3D モデルのため、現在の DWG 読み込みでは変換できません。平面化した DXF に書き出すか、3D モデルとして GLTF / OBJ / IFC などに変換して読み込んでください。';
	}

	return null;
};

const toDwgConversionError = (error: unknown, bytes: Uint8Array): Error => {
	if (error instanceof Error && error.message === 'unreachable') {
		const reason = detectUnsupportedDwgReason(bytes);
		if (reason) {
			return new Error(reason);
		}
	}

	return error instanceof Error ? error : new Error(String(error));
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
	const dwgBytes = new Uint8Array(arrayBuffer);

	try {
		const dxfBytes = await convertDwgToDxf(dwgBytes);
		return toExactArrayBuffer(dxfBytes);
	} catch (error) {
		throw toDwgConversionError(error, dwgBytes);
	}
};

export const dwgArrayBufferToGeoJson = async (
	arrayBuffer: ArrayBuffer
): Promise<FeatureCollection> => {
	const dxfArrayBuffer = await convertDwgArrayBufferToDxfArrayBuffer(arrayBuffer);
	return dxfArrayBufferToGeoJson(dxfArrayBuffer);
};

export const dwgFileToGeoJsonBrowser = async (file: File): Promise<FeatureCollection> =>
	dwgArrayBufferToGeoJson(await file.arrayBuffer());
