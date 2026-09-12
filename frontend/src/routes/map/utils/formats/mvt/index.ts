import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import { inspectLocalTileFolder, parseLocalTilePath } from '../local-tiles';
import { getLocalFilePath } from '../tiles3d';

export interface LocalMvtLayer {
	id: string;
	fields: Record<string, string>;
	geometryTypes: VectorEntryGeometryType[];
}

export interface LocalMvtSource {
	name: string;
	tiles: Map<string, File>;
	bounds: [number, number, number, number];
	minZoom: number;
	maxZoom: number;
	layers: LocalMvtLayer[];
}

export const isMvtFile = (file: File) => /\.(mvt|pbf)(\.gz)?$/i.test(file.name);
export const isLocalMvtInput = (files: File[]) =>
	files.some(isMvtFile) || files.some(file => /^tilejson\.json$/i.test(file.name));

export const parseMvtPath = (file: File) => parseLocalTilePath(file, /\.(mvt|pbf)(\.gz)?$/i);

/** gzipも、必要になったタイルだけ展開する。 */
export const readMvtBytes = async (file: File): Promise<ArrayBuffer> => {
	const data = await file.arrayBuffer();
	const header = new Uint8Array(data, 0, Math.min(2, data.byteLength));
	if (header[0] !== 0x1f || header[1] !== 0x8b) return data;
	return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip')))
		.arrayBuffer();
};

export const inspectLocalMvt = async (files: File[]): Promise<LocalMvtSource> => {
	const { metadata, tiles, bounds, minZoom, maxZoom, name } = await inspectLocalTileFolder(
		files,
		{ isTileFile: isMvtFile, extension: /\.(mvt|pbf)(\.gz)?$/i, label: 'MVT' }
	);
	const layers = new Map<string, LocalMvtLayer>();
	for (const layer of Array.isArray(metadata.vector_layers) ? metadata.vector_layers : []) {
		if (typeof layer?.id !== 'string' || !layer.id) continue;
		const fields: Record<string, string> = {};
		for (const [key, value] of Object.entries(layer.fields ?? {})) {
			if (typeof value === 'string') fields[key] = value;
		}
		layers.set(layer.id, { id: layer.id, fields, geometryTypes: [] });
	}
	// 低ズームの少数タイルから形状・属性を調べる。全タイル・全地物は走査しない。
	const samples = [...tiles.entries()].sort(([a], [b]) =>
		Number(a.split('/')[0]) - Number(b.split('/')[0])
	).slice(0, 8);
	for (const [, file] of samples) {
		let tile: VectorTile;
		try {
			tile = new VectorTile(new Pbf(await readMvtBytes(file)));
		} catch {
			throw new Error(`MVTタイルを読み取れませんでした: ${getLocalFilePath(file)}`);
		}
		for (const [id, sourceLayer] of Object.entries(tile.layers)) {
			const layer = layers.get(id) ?? { id, fields: {}, geometryTypes: [] } as LocalMvtLayer;
			for (let i = 0; i < Math.min(sourceLayer.length, 200); i++) {
				const feature = sourceLayer.feature(i);
				const geometry =
					({ 0: undefined, 1: 'Point', 2: 'LineString', 3: 'Polygon' } as const)[
						feature.type
					];
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
	if (!layers.size) throw new Error('MVTのソースレイヤーを取得できませんでした。');
	return {
		name,
		tiles,
		bounds,
		minZoom,
		maxZoom,
		layers: [...layers.values()]
	};
};
