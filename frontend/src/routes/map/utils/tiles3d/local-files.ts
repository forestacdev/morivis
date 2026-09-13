import {
	getLocalFilePath,
	isTileset,
	readLocalTileset,
	readLocalTilesetBody
} from '../formats/tiles3d';

// 相対URLをloaders.glが解決できる仮想URL。通信せず、このモジュールでFileへ解決する。
const LOCAL_ORIGIN = 'https://morivis-local.invalid';
const LOCAL_PREFIX = `${LOCAL_ORIGIN}/3dtiles/`;
const sources = new Map<string, Map<string, File>>();
const entrySources = new Map<string, string>();

export const isLocalTilesetUrl = (url: string): boolean => url.startsWith(LOCAL_PREFIX);
const getSourceKey = (url: string) => url.slice(LOCAL_PREFIX.length).split('/')[0];
const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

export const releaseLocalTileset = (url: string): void => {
	if (!isLocalTilesetUrl(url)) return;
	const key = getSourceKey(url);
	sources.delete(key);
	for (const [id, sourceKey] of entrySources) if (sourceKey === key) entrySources.delete(id);
};

export const retainLocalTilesetEntry = (entryId: string, url: string): void => {
	if (isLocalTilesetUrl(url) && sources.has(getSourceKey(url))) {
		entrySources.set(entryId, getSourceKey(url));
	}
};

export const releaseLocalTilesetEntry = (entryId: string): void => {
	const key = entrySources.get(entryId);
	entrySources.delete(entryId);
	if (key && ![...entrySources.values()].includes(key)) sources.delete(key);
};

const findFile = (url: string): File | undefined => {
	if (!isLocalTilesetUrl(url)) return undefined;
	const parsed = new URL(url);
	const path = decodeURIComponent(parsed.pathname.split('/').slice(3).join('/'));
	return sources.get(getSourceKey(url))?.get(path);
};

const getMimeType = (file: File): string => {
	if (/\.(json|gltf)$/i.test(file.name)) return 'application/json';
	if (/\.png$/i.test(file.name)) return 'image/png';
	if (/\.jpe?g$/i.test(file.name)) return 'image/jpeg';
	if (/\.webp$/i.test(file.name)) return 'image/webp';
	return file.type || 'application/octet-stream';
};

/** Fileを保持するだけで全タイルをメモリへ展開しない。レスポンスのurlは子リソースの基準になる。 */
export const fetchLocalTilesetResource = async (
	url: string,
	init?: RequestInit
): Promise<Response> => {
	if (!isLocalTilesetUrl(url)) {
		if (new URL(url).origin === LOCAL_ORIGIN) {
			throw new Error('3D Tilesの参照がフォルダの外を指しています');
		}
		return fetch(url, init);
	}
	init?.signal?.throwIfAborted();
	const file = findFile(url);
	if (!file) {
		throw new Error(
			`3D Tilesの参照ファイルがありません: ${
				decodeURIComponent(new URL(url).pathname.split('/').slice(3).join('/'))
			}`
		);
	}
	const body = await readLocalTilesetBody(file);
	init?.signal?.throwIfAborted();
	const response = new Response(body, { headers: { 'Content-Type': getMimeType(file) } });
	Object.defineProperty(response, 'url', { value: url });
	return response;
};

export const registerLocalTileset = async (files: File[], rootFile: File) => {
	const fileMap = new Map<string, File>();
	for (const file of files) {
		const path = getLocalFilePath(file);
		if (path.split('/').some(part => part === '..' || part === '.')) {
			throw new Error(`ファイルの相対パスが不正です: ${path}`);
		}
		if (fileMap.has(path) && fileMap.get(path) !== file) {
			throw new Error(`同じパスのファイルがあります: ${path}`);
		}
		fileMap.set(path, file);
	}
	const rootPath = getLocalFilePath(rootFile);
	if (fileMap.get(rootPath) !== rootFile) {
		throw new Error('タイルセットのファイルが見つかりません');
	}
	const key = crypto.randomUUID();
	const base = `${LOCAL_PREFIX}${key}/`;
	const url = base + encodePath(rootPath);
	const tileset = await readLocalTileset(rootFile);
	sources.set(key, fileMap);
	try {
		// 外部tileset.jsonも検査する。参照循環は既読URLで止め、バイナリは読まない。
		const visited = new Set<string>();
		const validate = async (document: unknown, documentUrl: string): Promise<void> => {
			if (visited.has(documentUrl)) return;
			visited.add(documentUrl);
			if (!isTileset(document)) throw new Error('参照先のJSONが3D Tilesではありません');
			const nodes: Record<string, unknown>[] = [document.root];
			while (nodes.length) {
				const node = nodes.pop()!;
				const contents = [
					node.content,
					...(Array.isArray(node.contents) ? node.contents : [])
				];
				for (const content of contents) {
					if (!content || typeof content !== 'object') continue;
					const uri = (content as { uri?: string; url?: string; }).uri
						?? (content as { url?: string; }).url;
					if (!uri || /\{[^}]+\}/.test(uri)) continue;
					const target = new URL(uri, documentUrl).href;
					if (new URL(target).origin !== LOCAL_ORIGIN) continue;
					if (!target.startsWith(base)) {
						throw new Error(`フォルダの外を参照しています: ${uri}`);
					}
					const file = findFile(target);
					if (!file) {
						throw new Error(
							`参照ファイルがありません: ${uri}。tileset.jsonを含むフォルダ全体をドロップしてください。`
						);
					}
					if (/\.json$/i.test(file.name) && !visited.has(target)) {
						await validate(await readLocalTileset(file), target);
					}
				}
				if (Array.isArray(node.children)) nodes.push(...node.children);
			}
		};
		await validate(tileset, url);
		return { url, tileset, dispose: () => releaseLocalTileset(url) };
	} catch (error) {
		releaseLocalTileset(url);
		throw error;
	}
};
