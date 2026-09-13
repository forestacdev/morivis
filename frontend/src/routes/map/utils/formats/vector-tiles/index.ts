import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import { inspectLocalTileFolder } from '../local-tiles';
import { getLocalFilePath } from '../tiles3d';

export interface LocalVectorTileLayer {
	id: string;
	fields: Record<string, string>;
	geometryTypes: VectorEntryGeometryType[];
}

export interface LocalVectorTileSource {
	name: string;
	tiles: Map<string, File>;
	bounds: [number, number, number, number];
	minZoom: number;
	maxZoom: number;
	layers: LocalVectorTileLayer[];
}

export interface DecodedVectorTileLayer {
	id: string;
	features: { geometryType?: VectorEntryGeometryType; properties: Record<string, unknown>; }[];
}

/** gzipも、必要になったタイルだけ展開する。 */
export const readVectorTileBytes = async (file: File): Promise<ArrayBuffer> => {
	const data = await file.arrayBuffer();
	const header = new Uint8Array(data, 0, Math.min(2, data.byteLength));
	if (header[0] !== 0x1f || header[1] !== 0x8b) return data;
	return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip')))
		.arrayBuffer();
};

export const inspectLocalVectorTiles = async (
	files: File[],
	options: {
		isTileFile: (file: File) => boolean;
		extension: RegExp;
		label: string;
		decode: (data: ArrayBuffer) => DecodedVectorTileLayer[];
	}
): Promise<LocalVectorTileSource> => {
	const { metadata, tiles, bounds, minZoom, maxZoom, name } = await inspectLocalTileFolder(
		files,
		options
	);
	const layers = new Map<string, LocalVectorTileLayer>();
	for (const layer of Array.isArray(metadata.vector_layers) ? metadata.vector_layers : []) {
		if (typeof layer?.id !== 'string' || !layer.id) continue;
		const fields: Record<string, string> = {};
		for (const [key, value] of Object.entries(layer.fields ?? {})) {
			if (typeof value === 'string') fields[key] = value;
		}
		layers.set(layer.id, { id: layer.id, fields, geometryTypes: [] });
	}
	const samples = [...tiles.entries()].sort(([a], [b]) =>
		Number(a.split('/')[0]) - Number(b.split('/')[0])
	).slice(0, 8);
	for (const [, file] of samples) {
		let decoded: DecodedVectorTileLayer[];
		try {
			decoded = options.decode(await readVectorTileBytes(file));
		} catch {
			throw new Error(
				`${options.label}タイルを読み取れませんでした: ${getLocalFilePath(file)}`
			);
		}
		for (const { id, features } of decoded) {
			const layer = layers.get(id)
				?? { id, fields: {}, geometryTypes: [] } as LocalVectorTileLayer;
			for (const feature of features.slice(0, 200)) {
				const geometry = feature.geometryType;
				if (geometry && !layer.geometryTypes.includes(geometry)) {
					layer.geometryTypes.push(geometry);
				}
				for (const [key, value] of Object.entries(feature.properties)) {
					if (!Object.hasOwn(layer.fields, key)) layer.fields[key] = typeof value;
				}
			}
			layers.set(id, layer);
		}
		if (layers.size && [...layers.values()].every(layer => layer.geometryTypes.length)) break;
	}
	if (!layers.size) throw new Error(`${options.label}のソースレイヤーを取得できませんでした。`);
	return { name, tiles, bounds, minZoom, maxZoom, layers: [...layers.values()] };
};
