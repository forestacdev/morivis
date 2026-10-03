import { czmlModelLimits } from './definition';

const localBase = 'https://czml-local.invalid/';
const pathOf = (file: File) => (file.webkitRelativePath || file.name).replaceAll('\\', '/');

/** ドロップ一式の相対参照と公開URLを解決する。ローカル参照をWebサーバーへ送らない。 */
export const createCzmlAssetResolver = (document: File, files: File[], signal: AbortSignal) => {
	const cache = new Map<string, Promise<ArrayBuffer>>();
	let bytes = 0;
	const baseUrl = new URL(pathOf(document), localBase).href;
	const resolve = (uri: string, base = baseUrl) => {
		const url = new URL(uri.replaceAll('\\', '/'), base);
		if (!['http:', 'https:', 'data:'].includes(url.protocol)) {
			throw new Error('CZMLモデルの参照には相対パス・HTTP(S)・data URIを指定してください');
		}
		return url.href;
	};
	const count = (size: number) => {
		bytes += size;
		if (bytes > czmlModelLimits.maxBytes) {
			throw new Error('CZMLのモデル・関連ファイルが合計128 MiBを超えています');
		}
	};
	const read = (url: string): Promise<ArrayBuffer> => {
		signal.throwIfAborted();
		if (!cache.has(url)) {
			cache.set(
				url,
				(async () => {
					const target = new URL(url);
					if (target.origin === new URL(localBase).origin) {
						const path = decodeURIComponent(target.pathname);
						const exact = files.filter(file =>
							decodeURIComponent(new URL(pathOf(file), localBase).pathname) === path
						);
						const matches = exact.length
							? exact
							: files.filter(file =>
								pathOf(file).split('/').at(-1) === path.split('/').at(-1)
							);
						if (matches.length !== 1) {
							throw new Error(
								matches.length
									? `同名の関連ファイルを特定できません: ${path}。フォルダー構成を保ったZIPで読み込んでください`
									: `関連ファイルがありません: ${path}。CZMLとモデル・関連ファイルをまとめて選択してください`
							);
						}
						count(matches[0].size);
						const data = await matches[0].arrayBuffer();
						signal.throwIfAborted();
						return data;
					}
					const response = await fetch(url, { signal, credentials: 'omit' });
					if (!response.ok) {
						throw new Error(
							`CZMLモデルの取得に失敗しました（HTTP ${response.status}）`
						);
					}
					if (!response.body) throw new Error('CZMLモデルの内容を取得できません');
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
