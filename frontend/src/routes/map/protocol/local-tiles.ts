/** Fileの所有者と寿命を管理し、MapLibreの要求時だけ読み込む。 */
export const createLocalTileRegistry = (
	protocol: string,
	read: (file: File) => Promise<ArrayBuffer>,
	empty: () => ArrayBuffer
) => {
	const sources = new Map<string, Map<string, File>>();
	const owners = new Map<string, string>();
	const sourceKey = (url: string) =>
		url.startsWith(`${protocol}://`) ? url.slice(protocol.length + 3).split('/')[0] : undefined;

	const retain = (id: string, url: string) => {
		const key = sourceKey(url);
		if (key && sources.has(key)) owners.set(id, key);
	};

	const release = (id: string) => {
		const key = owners.get(id);
		owners.delete(id);
		if (key && ![...owners.values()].includes(key)) sources.delete(key);
	};

	const register = (source: { tiles: Map<string, File>; }) => {
		const key = crypto.randomUUID();
		sources.set(key, source.tiles);
		return {
			url: `${protocol}://${key}/{z}/{x}/{y}`,
			dispose: () => {
				sources.delete(key);
				for (const [id, sourceId] of owners) if (sourceId === key) owners.delete(id);
			}
		};
	};

	/** MapLibreの要求に応じてFileを読む。存在しない座標は空タイル。 */
	const request = async (
		params: { url: string; },
		abortController: AbortController
	): Promise<{ data: ArrayBuffer; }> => {
		const signal = abortController.signal;
		signal.throwIfAborted();
		const match = params.url.startsWith(`${protocol}://`)
			? /^([^/]+)\/(\d+)\/(\d+)\/(\d+)$/.exec(params.url.slice(protocol.length + 3))
			: null;
		if (!match) throw new Error('ローカルタイルのURLが不正です。');
		const tiles = sources.get(match[1]);
		if (!tiles) throw new Error('タイルのフォルダをもう一度ドロップしてください。');
		const file = tiles.get(`${match[2]}/${match[3]}/${match[4]}`);
		const data = file ? await read(file) : empty();
		signal.throwIfAborted();
		return { data };
	};

	return { register, retain, release, request };
};
