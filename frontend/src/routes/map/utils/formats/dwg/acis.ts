import type { IndexedCadMesh } from '../dxf/indexed-mesh';
import { formatDwg } from './definition';
import { loadDwgRuntime } from './runtime';

export interface SkippedDwgSolid {
	handle: string;
	layer: string;
	entityType: '3DSOLID' | 'BODY' | 'REGION';
	blockPath: string[];
	reason: string;
}
interface BinarySolidHeader {
	layer: string;
	color: string;
	entityType: IndexedCadMesh['entityType'];
	vertexCount: number;
	triangleCount: number;
}
export interface DwgSolidDescriptor {
	layer: string;
	entityType: IndexedCadMesh['entityType'];
}
export type DwgReadOptions = { mode: 'inspect'; } | { mode: 'convert'; layers: string[]; };

export interface DecodedDrawing {
	solidDescriptors: DwgSolidDescriptor[];
	dxf: string;
	solids: IndexedCadMesh[];
	skippedSolids: SkippedDwgSolid[];
}

export const readDwgBinary = (input: Uint8Array): DecodedDrawing => {
	const bytes = input.byteOffset % 8 === 0 ? input : input.slice();
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const invalid = () => new Error('DWGの変換結果が不正です');
	if (bytes.length < 8 || view.getUint32(0, true) !== 0x3157444d) throw invalid();
	const headerLength = view.getUint32(4, true);
	if (headerLength > bytes.length - 8) throw invalid();
	const header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + headerLength))) as {
		dxf: string;
		solids: BinarySolidHeader[];
		skippedSolids: SkippedDwgSolid[];
	};
	let offset = Math.ceil((8 + headerLength) / 8) * 8;
	const solids = header.solids.map(solid => {
		if (
			!Number.isSafeInteger(solid.vertexCount) || solid.vertexCount < 1
			|| !Number.isSafeInteger(solid.triangleCount) || solid.triangleCount < 1
		) throw invalid();
		const positionBytes = solid.vertexCount * 24;
		const indexBytes = solid.triangleCount * 12;
		if (offset + positionBytes + indexBytes > bytes.length) throw invalid();
		const positions = new Float64Array(
			bytes.buffer,
			bytes.byteOffset + offset,
			solid.vertexCount * 3
		);
		offset += positionBytes;
		const indices = new Uint32Array(
			bytes.buffer,
			bytes.byteOffset + offset,
			solid.triangleCount * 3
		);
		offset = Math.ceil((offset + indexBytes) / 8) * 8;
		for (const index of indices) if (index >= solid.vertexCount) throw invalid();
		return {
			layer: solid.layer,
			color: solid.color,
			entityType: solid.entityType,
			positions,
			indices,
			bounds: [
				Infinity,
				Infinity,
				Infinity,
				-Infinity,
				-Infinity,
				-Infinity
			] as IndexedCadMesh['bounds']
		};
	});
	if (offset !== bytes.length) throw invalid();
	return { dxf: header.dxf, skippedSolids: header.skippedSolids, solids, solidDescriptors: [] };
};

export const decodeDwgWithSolids = async (
	buffer: ArrayBuffer,
	options?: DwgReadOptions
): Promise<DecodedDrawing> => {
	if (buffer.byteLength > formatDwg.limits.maxFileBytes) {
		throw new Error('DWGの読み込み上限は128 MiBです。図面を分割してください。');
	}
	const runtime = await loadDwgRuntime();
	try {
		const bytes = new Uint8Array(buffer);
		if (options?.mode === 'inspect') {
			return JSON.parse(runtime.inspect_dwg(bytes)) as DecodedDrawing;
		}
		return readDwgBinary(
			options?.mode === 'convert'
				? runtime.decode_dwg_layers(bytes, JSON.stringify(options.layers))
				: runtime.decode_dwg_binary(bytes)
		);
	} catch (error) {
		throw dwgConversionError(error);
	}
};

export const dwgConversionError = (error: unknown): Error => {
	if (error instanceof WebAssembly.RuntimeError) {
		return new Error(
			'DWGの変換エンジンが処理を継続できませんでした。メモリ不足、または変換エンジン内部のエラーが考えられます。',
			{ cause: error }
		);
	}
	return error instanceof Error ? error : new Error(String(error));
};
