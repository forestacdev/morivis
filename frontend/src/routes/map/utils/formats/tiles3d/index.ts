export type LocalTileset = {
	asset: { version: string; };
	root: Record<string, unknown>;
	[key: string]: unknown;
};

/** 拡張子を変えずにgzip圧縮された配信用ファイルも、読み込み時にだけ展開する。 */
export const readLocalTilesetBody = async (
	file: File
): Promise<Blob | ReadableStream<Uint8Array>> => {
	const header = new Uint8Array(await file.slice(0, 2).arrayBuffer());
	if (header[0] !== 0x1f || header[1] !== 0x8b) return file;
	return file.stream().pipeThrough(new DecompressionStream('gzip'));
};

export const getLocalFilePath = (file: File): string => {
	const pathFile = file as File & { morivisRelativePath?: string; };
	return (pathFile.morivisRelativePath || file.webkitRelativePath || file.name)
		.replaceAll('\\', '/').replace(/^\/+/, '');
};

export const isTileset = (value: unknown): value is LocalTileset => {
	if (!value || typeof value !== 'object') return false;
	const data = value as Partial<LocalTileset>;
	return typeof data.asset?.version === 'string' && !!data.root
		&& typeof data.root === 'object' && !Array.isArray(data.root);
};

export const readLocalTileset = async (file: File): Promise<LocalTileset> => {
	const value: unknown = await new Response(await readLocalTilesetBody(file)).json();
	if (!isTileset(value)) throw new Error(`${file.name} は3D Tilesのタイルセットではありません`);
	return value;
};

/** GeoJSONやglTFを含むフォルダでもタイルセットを優先する。タイル本体は読まない。 */
export const findLocalTilesetFiles = async (files: File[]): Promise<File[]> => {
	const candidates = files.filter(file => /\.json$/i.test(file.name));
	const matches: File[] = [];
	for (const file of candidates) {
		try {
			await readLocalTileset(file);
			matches.push(file);
		} catch {
			// 他形式のJSONや壊れたJSONは、既存の形式判定・フォームに渡す。
		}
	}
	return matches.sort((a, b) => {
		const aPath = getLocalFilePath(a), bPath = getLocalFilePath(b);
		return aPath.split('/').length - bPath.split('/').length
			|| Number(!/^(tileset|tiles)\.json$/i.test(a.name))
				- Number(!/^(tileset|tiles)\.json$/i.test(b.name))
			|| aPath.localeCompare(bPath);
	});
};
