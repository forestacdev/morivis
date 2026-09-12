import * as tilebelt from '@mapbox/tilebelt';
import { getLocalFilePath } from '../tiles3d';

export const parseLocalTilePath = (file: File, extension: RegExp) => {
	const path = getLocalFilePath(file);
	if (path.split('/').some(part => part === '.' || part === '..')) return null;
	if (!extension.test(path)) return null;
	const match = /^(.*?)(\d+)\/(\d+)\/(\d+)\.[^/]+$/i.exec(path);
	if (!match || (match[1] && !match[1].endsWith('/'))) return null;
	const [z, x, y] = match.slice(2).map(Number);
	if (!Number.isInteger(z) || z < 0 || z > 24 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) {
		return null;
	}
	return { root: match[1], z, x, y };
};

const validBounds = (value: unknown): value is [number, number, number, number] =>
	Array.isArray(value) && value.length === 4 && value.every(Number.isFinite)
	&& value[0] >= -180 && value[2] <= 180 && value[1] >= -90 && value[3] <= 90
	&& value[0] < value[2] && value[1] < value[3];

export const inspectLocalTileFolder = async (
	files: File[],
	options: {
		isTileFile: (file: File) => boolean;
		extension: RegExp;
		label: string;
		scheme?: 'xyz' | 'tms';
	}
) => {
	const metadataFiles = files.filter(file => /^tilejson\.json$/i.test(file.name));
	if (metadataFiles.length > 1) {
		throw new Error(`${options.label}のフォルダを1つずつドロップしてください。`);
	}
	const metadata = metadataFiles[0] ? JSON.parse(await metadataFiles[0].text()) : {};
	if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
		throw new Error('TileJSONの形式が不正です。');
	}
	if (metadata.scheme && metadata.scheme !== 'xyz' && metadata.scheme !== 'tms') {
		throw new Error('対応していないタイル座標方式です。');
	}
	const tileFiles = files.filter(options.isTileFile);
	if (!tileFiles.length) {
		throw new Error(
			'タイルがありません。画像やMVTを含むフォルダ全体をドロップしてください。'
		);
	}
	const tiles = new Map<string, File>();
	const roots = new Set<string>();
	let minZoom = 24, maxZoom = 0;
	let bounds: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
	for (const file of tileFiles) {
		const position = parseLocalTilePath(file, options.extension);
		if (!position) {
			throw new Error(
				'タイルの位置を特定できません。{z}/{x}/{y} の階層を保ったフォルダをドロップしてください。'
			);
		}
		const { root, z, x } = position;
		const y = (options.scheme ?? metadata.scheme) === 'tms'
			? 2 ** z - 1 - position.y
			: position.y;
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
	if (roots.size !== 1) {
		throw new Error(`${options.label}のフォルダを1つずつドロップしてください。`);
	}
	const root = [...roots][0];
	if (metadataFiles[0] && getLocalFilePath(metadataFiles[0]).replace(/[^/]+$/, '') !== root) {
		throw new Error('tilejson.jsonとタイルのフォルダ階層が一致しません。');
	}
	if (metadata.bounds !== undefined) {
		if (!validBounds(metadata.bounds)) throw new Error('TileJSONの表示範囲が不正です。');
		bounds = metadata.bounds;
	}
	return {
		metadata,
		tiles,
		bounds,
		minZoom,
		maxZoom,
		scheme: options.scheme ?? metadata.scheme ?? 'xyz',
		name: typeof metadata.name === 'string' && metadata.name.trim()
			? metadata.name
			: root.split('/').filter(Boolean).pop() ?? options.label
	};
};
