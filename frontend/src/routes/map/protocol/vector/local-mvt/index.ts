import { type LocalMvtSource, readMvtBytes } from '$routes/map/utils/formats/mvt';

export const LOCAL_MVT_PROTOCOL = 'local-mvt';
const sources = new Map<string, Map<string, File>>();
const owners = new Map<string, string>();
const sourceKey = (url: string) => /^local-mvt:\/\/([^/]+)\//.exec(url)?.[1];

export const retainLocalMvtEntry = (id: string, url: string) => {
	const key = sourceKey(url);
	if (key && sources.has(key)) owners.set(id, key);
};

export const releaseLocalMvtEntry = (id: string) => {
	const key = owners.get(id);
	owners.delete(id);
	if (key && ![...owners.values()].includes(key)) sources.delete(key);
};

export const registerLocalMvt = (source: LocalMvtSource) => {
	const key = crypto.randomUUID();
	sources.set(key, source.tiles);
	return {
		url: `${LOCAL_MVT_PROTOCOL}://${key}/{z}/{x}/{y}`,
		dispose: () => {
			sources.delete(key);
			for (const [id, sourceId] of owners) if (sourceId === key) owners.delete(id);
		}
	};
};

/** MapLibreの要求に応じてFileを読む。存在しない座標は空タイル。 */
export const requestLocalMvt = async (
	params: { url: string; },
	abortController: AbortController
): Promise<{ data: ArrayBuffer; }> => {
	const signal = abortController.signal;
	signal.throwIfAborted();
	const match = /^local-mvt:\/\/([^/]+)\/(\d+)\/(\d+)\/(\d+)$/.exec(params.url);
	if (!match) throw new Error('ローカルMVTのURLが不正です。');
	const tiles = sources.get(match[1]);
	if (!tiles) throw new Error('MVTフォルダをもう一度ドロップしてください。');
	const file = tiles.get(`${match[2]}/${match[3]}/${match[4]}`);
	const data = file ? await readMvtBytes(file) : new ArrayBuffer(0);
	signal.throwIfAborted();
	return { data };
};
