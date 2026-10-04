import { czmlModelLimits } from './definition';
import { czmlFilePath } from './files';

const localBase = 'https://czml-local.invalid/';
export const createCzmlAssetLocator = (document: File, files: File[]) => {
	const baseUrl = new URL(czmlFilePath(document), localBase).href;
	const resolve = (uri: string, base = baseUrl) => {
		const url = new URL(uri.replaceAll('\\', '/'), base);
		if (!['http:', 'https:', 'data:'].includes(url.protocol)) {
			throw new Error('CZMLの参照には相対パス・HTTP(S)・data URIを指定してください');
		}
		return url.href;
	};
	const localPath = (url: string): string | null => {
		const target = new URL(url);
		return target.origin === new URL(localBase).origin
			? decodeURIComponent(target.pathname)
			: null;
	};
	const findLocalFile = (url: string): File | undefined => {
		const path = localPath(url);
		if (path === null) return undefined;
		const exact = files.filter(file =>
			decodeURIComponent(new URL(czmlFilePath(file), localBase).pathname) === path
		);
		const matches = exact.length
			? exact
			: files.filter(file => czmlFilePath(file).split('/').at(-1) === path.split('/').at(-1));
		if (matches.length > 1) {
			throw new Error(
				`同名の関連ファイルを特定できません: ${path}。フォルダー構成を保ったZIPで読み込んでください`
			);
		}
		return matches[0];
	};
	return { resolve, localPath, findLocalFile };
};

/** ドロップ一式の相対参照と公開URLを解決する。ローカル参照をWebサーバーへ送らない。 */
export const createCzmlAssetResolver = (
	document: File,
	files: File[],
	signal: AbortSignal,
	maxBytes: number = czmlModelLimits.maxBytes
) => {
	const cache = new Map<string, Promise<ArrayBuffer>>();
	let bytes = 0;
	const { resolve, localPath, findLocalFile } = createCzmlAssetLocator(document, files);
	const count = (size: number) => {
		bytes += size;
		if (bytes > maxBytes) {
			throw new Error(`CZMLの関連ファイルが合計${maxBytes / 1024 / 1024} MiBを超えています`);
		}
	};
	const read = (url: string): Promise<ArrayBuffer> => {
		signal.throwIfAborted();
		if (!cache.has(url)) {
			cache.set(
				url,
				(async () => {
					const path = localPath(url);
					if (path !== null) {
						const file = findLocalFile(url);
						if (!file) {
							throw new Error(
								`関連ファイルがありません: ${path}。このファイルをフォームに追加ドロップしてください`
							);
						}
						count(file.size);
						const data = await file.arrayBuffer();
						signal.throwIfAborted();
						return data;
					}
					const response = await fetch(url, { signal, credentials: 'omit' });
					if (!response.ok) {
						throw new Error(
							`CZML関連ファイルの取得に失敗しました（HTTP ${response.status}）`
						);
					}
					if (!response.body) throw new Error('CZML関連ファイルの内容を取得できません');
					const reader = response.body.getReader();
					const parts: Uint8Array<ArrayBuffer>[] = [];
					let length = 0;
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							count(value.byteLength);
							parts.push(value);
							length += value.byteLength;
						}
					} finally {
						await reader.cancel();
					}
					const data = new Uint8Array(length);
					let offset = 0;
					for (const part of parts) {
						data.set(part, offset);
						offset += part.byteLength;
					}
					return data.buffer;
				})()
			);
		}
		return cache.get(url)!;
	};
	return { resolve, read };
};
