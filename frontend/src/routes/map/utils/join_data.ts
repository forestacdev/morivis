/** Join Dataのキャッシュを管理するクラス */
export class JoinDataCache {
	private static cache: Map<string, Record<string, Record<string, any>>> = new Map();

	// Join Dataをキャッシュに保存する
	static set(key: string, data: Record<string, Record<string, any>>): void {
		this.cache.set(key, data);
	}

	// キャッシュからJoin Dataを取得する
	static get(key: string): Record<string, Record<string, any>> | undefined {
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
