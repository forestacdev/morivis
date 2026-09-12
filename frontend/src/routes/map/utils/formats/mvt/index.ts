import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import * as tilebelt from '@mapbox/tilebelt';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
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

export const parseMvtPath = (file: File) => {
	const path = getLocalFilePath(file);
	if (path.split('/').some(part => part === '.' || part === '..')) return null;
	const match = /^(.*?)(\d+)\/(\d+)\/(\d+)\.(?:mvt|pbf)(?:\.gz)?$/i.exec(path);
	if (!match || (match[1] && !match[1].endsWith('/'))) return null;
	const [z, x, y] = match.slice(2).map(Number);
	if (!Number.isInteger(z) || z < 0 || z > 24 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) {
		return null;
	}
	return { root: match[1], z, x, y };
};

/** gzipも、必要になったタイルだけ展開する。 */
export const readMvtBytes = async (file: File): Promise<ArrayBuffer> => {
	const data = await file.arrayBuffer();
	const header = new Uint8Array(data, 0, Math.min(2, data.byteLength));
	if (header[0] !== 0x1f || header[1] !== 0x8b) return data;
	return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip')))
		.arrayBuffer();
};

const validBounds = (value: unknown): value is [number, number, number, number] =>
	Array.isArray(value) && value.length === 4 && value.every(Number.isFinite)
	&& value[0] >= -180 && value[2] <= 180 && value[1] >= -90 && value[3] <= 90
	&& value[0] < value[2] && value[1] < value[3];

export const inspectLocalMvt = async (files: File[]): Promise<LocalMvtSource> => {
	const metadataFiles = files.filter(file => /^tilejson\.json$/i.test(file.name));
	if (metadataFiles.length > 1) throw new Error('MVTのフォルダを1つずつドロップしてください。');
	const metadata = metadataFiles[0] ? JSON.parse(await metadataFiles[0].text()) : {};
	if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
		throw new Error('TileJSONの形式が不正です。');
	}
	if (metadata.scheme && metadata.scheme !== 'xyz' && metadata.scheme !== 'tms') {
		throw new Error('対応していないタイル座標方式です。');
	}
	const tileFiles = files.filter(isMvtFile);
	if (!tileFiles.length) {
		throw new Error(
			'MVTタイルがありません。tilejson.jsonを含むフォルダ全体をドロップしてください。'
		);
	}
	const tiles = new Map<string, File>();
	const roots = new Set<string>();
	let minZoom = 24, maxZoom = 0;
	let bounds: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
	for (const file of tileFiles) {
		const position = parseMvtPath(file);
		if (!position) {
			throw new Error(
				'MVTの位置を特定できません。{z}/{x}/{y}.mvt の階層を保ったフォルダをドロップしてください。'
			);
		}
		const { root, z, x } = position;
		const y = metadata.scheme === 'tms' ? 2 ** z - 1 - position.y : position.y;
		roots.add(root);
		const key = `${z}/${x}/${y}`;
		if (tiles.has(key)) throw new Error(`同じタイル座標のファイルが重複しています: ${key}`);
		tiles.set(key, file);
		minZoom = Math.min(minZoom, z);
		maxZoom = Math.max(maxZoom, z);
		const b = tilebelt.tileToBBOX([x, y, z]);
		bounds = [
			Math.min(bounds[0], b[0]),
			Math.min(bounds[1], b[1]),
			Math.max(bounds[2], b[2]),
			Math.max(bounds[3], b[3])
		];
	}
	if (roots.size !== 1) throw new Error('MVTのフォルダを1つずつドロップしてください。');
	const root = [...roots][0];
	if (metadataFiles[0] && getLocalFilePath(metadataFiles[0]).replace(/[^/]+$/, '') !== root) {
		throw new Error('tilejson.jsonとタイルのフォルダ階層が一致しません。');
	}
	if (metadata.bounds !== undefined) {
		if (!validBounds(metadata.bounds)) throw new Error('TileJSONの表示範囲が不正です。');
		bounds = metadata.bounds;
	}
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
		name: typeof metadata.name === 'string' && metadata.name.trim()
			? metadata.name
			: root.split('/').filter(Boolean).pop() ?? 'MVT',
		tiles,
		bounds,
		minZoom,
		maxZoom,
		layers: [...layers.values()]
	};
};
