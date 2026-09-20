import lz4 from 'lz4js';
import { ZstdCodec } from 'zstd-codec';

export type Compression = 'none' | 'lz4' | 'zstd' | 'zstd-stream';
export interface TestChunk {
	kind: string;
	data: Uint8Array;
}
export const concat = (...arrays: Uint8Array[]) => {
	const result = new Uint8Array(arrays.reduce((total, data) => total + data.length, 0));
	let offset = 0;
	for (const array of arrays) {
		result.set(array, offset);
		offset += array.length;
	}
	return result;
};
export const u32 = (value: number) => {
	const result = new Uint8Array(4);
	new DataView(result.buffer).setUint32(0, value, true);
	return result;
};
export const text = (value: string) => {
	const bytes = new TextEncoder().encode(value);
	return concat(u32(bytes.length), bytes);
};
export const interleaved = (values: number[]) => {
	const result = new Uint8Array(values.length * 4);
	for (let byte = 0; byte < 4; byte++) {
		for (let i = 0; i < values.length; i++) {
			result[byte * values.length + i] = values[i] >>> (24 - byte * 8) & 255;
		}
	}
	return result;
};
export const refs = (values: number[]) => {
	let previous = 0;
	return interleaved(values.map(value => {
		const difference = value - previous;
		previous = value;
		return difference >= 0 ? difference * 2 : -difference * 2 - 1;
	}));
};
export const floats = (values: number[]) =>
	interleaved(values.map(value => {
		const view = new DataView(new ArrayBuffer(4));
		view.setFloat32(0, value, true);
		const bits = view.getUint32(0, true);
		return (bits << 1 | bits >>> 31) >>> 0;
	}));
export const vectors = (values: number[][]) =>
	concat(...[0, 1, 2].map(axis => floats(values.map(value => value[axis]))));
export const inst = (
	id: number,
	name: string,
	references: number[],
	service = false
): TestChunk => ({
	kind: 'INST',
	data: concat(
		u32(id),
		text(name),
		new Uint8Array([Number(service)]),
		u32(references.length),
		refs(references),
		service ? new Uint8Array(references.length).fill(1) : new Uint8Array()
	)
});
export const prop = (id: number, name: string, type: number, values: Uint8Array): TestChunk => ({
	kind: 'PROP',
	data: concat(u32(id), text(name), new Uint8Array([type]), values)
});
export const parents = (
	children = [7, 11, 4, 1, 20, 30],
	parentRefs = [4, 4, 1, -1, 30, -1]
): TestChunk => ({
	kind: 'PRNT',
	data: concat(new Uint8Array([0]), u32(children.length), refs(children), refs(parentRefs))
});
export const frameValues = (rotationId?: number) => {
	const explicit = new Uint8Array(37);
	const view = new DataView(explicit.buffer);
	[0, 0, 1, 0, 1, 0, -1, 0, 0].forEach((value, i) => view.setFloat32(1 + i * 4, value, true));
	return concat(
		new Uint8Array([rotationId ?? 2]),
		explicit,
		new Uint8Array([2]),
		vectors([[10, 4, -8], [14, 8, -2], [99, 99, 99]])
	);
};
/** Workspace内の2パーツと、表示しないServerStorage内の1パーツ。すべて架空値。 */
export const testChunks = (rotationId?: number): TestChunk[] => [
	inst(0, 'Workspace', [1], true),
	inst(1, 'Model', [4]),
	inst(2, 'Part', [7, 11, 20]),
	inst(3, 'ServerStorage', [30], true),
	prop(2, 'size', 0x0e, vectors([[2, 4, 6], [4, 2, 2], [8, 8, 8]])),
	prop(2, 'CFrame', 0x10, frameValues(rotationId)),
	prop(2, 'shape', 0x12, interleaved([1, 3, 0])),
	prop(2, 'Color3uint8', 0x1a, new Uint8Array([255, 0, 40, 0, 128, 50, 0, 255, 60])),
	prop(2, 'Transparency', 0x04, floats([0, 0.5, 0])),
	// 描画と無関係の新しい型も、チャンク単位でスキップできる。
	prop(2, 'test-unused-property', 0xff, new Uint8Array([1, 2, 3])),
	parents(),
	{ kind: 'END', data: new TextEncoder().encode('</roblox>') }
];
interface Compressor {
	compress: (bytes: Uint8Array) => Uint8Array;
}
let zstd: Promise<{ Simple: new() => Compressor; Streaming: new() => Compressor; }> | undefined;
export const compressTestBlock = async (bytes: Uint8Array, compression: Compression) => {
	if (compression === 'none') return bytes;
	if (compression === 'lz4') {
		const output = new Uint8Array(lz4.compressBound(bytes.length));
		const count = lz4.compressBlock(bytes, output, 0, bytes.length, new Uint32Array(65536));
		if (count) return output.slice(0, count);
		const length = bytes.length, extra: number[] = [];
		if (length >= 15) {
			let remaining = length - 15;
			while (remaining >= 255) {
				extra.push(255);
				remaining -= 255;
			}
			extra.push(remaining);
		}
		return concat(new Uint8Array([Math.min(length, 15) << 4, ...extra]), bytes);
	}
	zstd ??= new Promise(resolve =>
		ZstdCodec.run(module => resolve(module as Awaited<NonNullable<typeof zstd>>))
	);
	const codec = await zstd;
	return compression === 'zstd'
		? new codec.Simple().compress(bytes)
		: new codec.Streaming().compress(bytes);
};
export const encodeRbxl = async (
	chunks = testChunks(),
	compression: Compression = 'none',
	classCount = 4,
	instanceCount = 6
) => {
	const header = new Uint8Array(32);
	header.set([60, 114, 111, 98, 108, 111, 120, 33, 137, 255, 13, 10, 26, 10]);
	new DataView(header.buffer).setUint32(16, classCount, true);
	new DataView(header.buffer).setUint32(20, instanceCount, true);
	const body: Uint8Array[] = [header];
	for (const chunk of chunks) {
		const compressed = compression !== 'none' && chunk.kind !== 'END';
		const data = compressed ? await compressTestBlock(chunk.data, compression) : chunk.data;
		const kind = new Uint8Array(4);
		kind.set(new TextEncoder().encode(chunk.kind));
		body.push(
			concat(kind, u32(compressed ? data.length : 0), u32(chunk.data.length), u32(0), data)
		);
	}
	return concat(...body);
};
