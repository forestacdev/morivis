export interface FeatureStateData {
	source: string;
	sourceLayer?: string;
}

/** featureStateを管理するクラス */
export class FeatureStateManager {
	private static cache: Map<string, FeatureStateData> = new Map();

	// 保存する
	static set(key: string, data: FeatureStateData) {
		this.cache.set(key, data);
	}

	// 取得する
	static get(key: string): FeatureStateData | undefined {
		return this.cache.get(key);
	}

	// 削除する
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
