import { fetchTilesetResource } from './fetch-resource';

/** i3dmの外部glTF取得は上流ローダーのfetchを迂回するため、取得元の基準URLを保持して埋め込む。 */
const rebaseGltf = (buffer: ArrayBuffer, url: string): Uint8Array => {
	const view = new DataView(buffer);
	const isGlb = buffer.byteLength >= 20 && view.getUint32(0, true) === 0x46546c67;
	const bytes = new Uint8Array(buffer);
	const jsonLength = isGlb ? view.getUint32(12, true) : bytes.length;
	const json = JSON.parse(
		new TextDecoder().decode(isGlb ? bytes.subarray(20, 20 + jsonLength) : bytes)
	);
	for (const item of [...(json.buffers ?? []), ...(json.images ?? [])]) {
		if (item.uri) item.uri = new URL(item.uri, url).href;
	}
	const metadata = json.extensions?.EXT_structural_metadata;
	if (metadata?.schemaUri) metadata.schemaUri = new URL(metadata.schemaUri, url).href;
	const encoded = new TextEncoder().encode(JSON.stringify(json));
	if (!isGlb) return encoded;
	const padded = new Uint8Array(Math.ceil(encoded.length / 4) * 4).fill(32);
	padded.set(encoded);
	const tail = bytes.subarray(20 + jsonLength);
	const result = new Uint8Array(20 + padded.length + tail.length);
	result.set(bytes.subarray(0, 20));
	result.set(padded, 20);
	result.set(tail, 20 + padded.length);
	const header = new DataView(result.buffer);
	header.setUint32(8, result.length, true);
	header.setUint32(12, padded.length, true);
	return result;
};

export const embedExternalTileModels = async (
	bytes: Uint8Array,
	url: string,
	init?: RequestInit
): Promise<Uint8Array> => {
	if (bytes.length < 16) return bytes;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const magic = view.getUint32(0, true);
	if (magic === 0x6d643369 && bytes.length >= 32 && view.getUint32(28, true) === 0) {
		const start = 32
			+ [12, 16, 20, 24].reduce((sum, offset) => sum + view.getUint32(offset, true), 0);
		const uri = new TextDecoder().decode(bytes.subarray(start)).replace(/[\0\s]+$/, '');
		const target = new URL(uri, url).href;
		const response = await fetchTilesetResource(target, init);
		if (!response.ok) throw new Error(`HTTP ${response.status}: ${target}`);
		const gltf = rebaseGltf(await response.arrayBuffer(), target);
		const result = new Uint8Array(Math.ceil((start + gltf.length) / 8) * 8);
		result.set(bytes.subarray(0, start));
		result.set(gltf, start);
		const header = new DataView(result.buffer);
		header.setUint32(8, result.length, true);
		header.setUint32(28, 1, true);
		return result;
	}
	if (magic === 0x74706d63) {
		const parts: Uint8Array[] = [];
		let offset = 16;
		for (let i = 0; i < view.getUint32(12, true); i++) {
			if (offset + 12 > bytes.length) throw new Error('cmptのタイル長が不正です');
			const length = view.getUint32(offset + 8, true);
			if (length < 12 || offset + length > bytes.length) {
				throw new Error('cmptのタイル長が不正です');
			}
			parts.push(
				await embedExternalTileModels(bytes.slice(offset, offset + length), url, init)
			);
			offset += length;
		}
		const result = new Uint8Array(16 + parts.reduce((sum, part) => sum + part.length, 0));
		result.set(bytes.subarray(0, 16));
		new DataView(result.buffer).setUint32(8, result.length, true);
		offset = 16;
		for (const part of parts) {
			result.set(part, offset);
			offset += part.length;
		}
		return result;
	}
	return bytes;
};

export const fetchRendererResource = async (url: string, init?: RequestInit) => {
	const response = await fetchTilesetResource(url, init);
	if (!response.ok || !/\.(i3dm|cmpt)(?:[?#]|$)/i.test(url)) return response;
	const bytes = await embedExternalTileModels(
		new Uint8Array(await response.arrayBuffer()),
		url,
		init
	);
	return new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]), {
		headers: { 'Content-Type': 'application/octet-stream' }
	});
};
