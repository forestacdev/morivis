type JoinDataRecord = Record<string, Record<string, unknown>>;

/** Join Dataのキャッシュを管理するクラス */
export class JoinDataCache {
	private static cache: Map<string, JoinDataRecord> = new Map();

	// Join Dataをキャッシュに保存する
	static set(key: string, data: JoinDataRecord): void {
		this.cache.set(key, data);
	}

	// キャッシュからJoin Dataを取得する
	static get(key: string): JoinDataRecord | undefined {
		return this.cache.get(key);
	}

	// キャッシュから特定のキーを削除する
	static remove(key: string): void {
		this.cache.delete(key);
	}

	// キャッシュをすべてクリアする
	static clear(): void {
		this.cache.clear();
	}

	// キャッシュに存在するか確認する
	static has(key: string): boolean {
		return this.cache.has(key);
	}

	// キャッシュのキーを取得する
	static keys(): IterableIterator<string> {
		return this.cache.keys();
	}
}
