// https://www.jma.go.jp/jma/kishou/know/kurashi/highres_nowcast.html

/**
 * 気象庁高解像度降水ナウキャストのタイルURL情報
 */
export interface TileInfo {
	/** タイルURL（{z}/{x}/{y}の形式） */
	url: string;
	/** 観測・予測時刻のタイムスタンプ */
	timestamp: number;
	/** 観測・予測時刻のDate object */
	date: Date;
	/** basetimeの文字列 */
	basetime: string;
}

/**
 * basetimeを日時に変換する関数
 * @param basetime - "202407101055" 形式の文字列
 * @returns Date object または null
 */
function parseBasetime(basetime: string): Date | null {
	try {
		// basetimeの形式: YYYYMMDDHHMMSS (14桁)
		if (basetime.length !== 14) return null;

		const year = parseInt(basetime.substring(0, 4));
		const month = parseInt(basetime.substring(4, 6)) - 1; // Monthは0ベース
		const day = parseInt(basetime.substring(6, 8));
		const hour = parseInt(basetime.substring(8, 10));
		const minute = parseInt(basetime.substring(10, 12));
		const second = parseInt(basetime.substring(12, 14));

		return new Date(year, month, day, hour, minute, second);
	} catch (error) {
		console.error('Failed to parse basetime:', basetime, error);
		return null;
	}
}

/**
 * 気象庁の高解像度降水ナウキャストのタイルURLを取得する関数
 * @param maxAge - キャッシュの最大年齢（秒）。デフォルトは300000秒
 * @returns タイル情報の配列のPromise
 */
export async function getJmaTileUrls(maxAge: number = 300000): Promise<TileInfo[]> {
	try {
		// APIエンドポイントからデータを取得
		const response = await fetch(
			'https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N1.json'
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		// データの検証
		if (!Array.isArray(data)) {
			throw new Error('Invalid data format: expected array');
		}

		// basetimeを抽出してソート（新しい順）
		const tileInfos: TileInfo[] = data
			.map((item) => item.basetime)
			.filter((basetime: string) => typeof basetime === 'string')
			.sort()
			.reverse()
			.map((basetime: string) => {
				const date = parseBasetime(basetime);
				if (!date) return null;

				return {
					url: `https://www.jma.go.jp/bosai/jmatile/data/nowc/${basetime}/none/${basetime}/surf/hrpns/{z}/{x}/{y}.png`,
					timestamp: date.getTime(),
					date: date,
					basetime: basetime
				};
			})
			.filter((item): item is TileInfo => item !== null);

		return tileInfos;
	} catch (error) {
		console.error('Failed to fetch JMA tile URLs:', error);
		throw new Error(
			`Failed to fetch JMA tile URLs: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * 最新のタイルURLのみを取得する関数
 * @returns 最新のタイル情報のPromise
 */
export async function getLatestJmaTileUrl(): Promise<TileInfo | null> {
	try {
		const tileInfos = await getJmaTileUrls();
		return tileInfos.length > 0 ? tileInfos[0] : null;
	} catch (error) {
		console.error('Failed to get latest JMA tile URL:', error);
		return null;
	}
}

/**
 * 指定した時間範囲内のタイルURLを取得する関数
 * @param hours - 何時間前までのデータを取得するか
 * @returns 指定時間範囲内のタイル情報の配列のPromise
 */
export async function getJmaTileUrlsWithinHours(hours: number = 1): Promise<TileInfo[]> {
	try {
		const tileInfos = await getJmaTileUrls();
		const cutoffTime = Date.now() - hours * 60 * 60 * 1000;

		return tileInfos.filter((tile) => tile.timestamp >= cutoffTime);
	} catch (error) {
		console.error('Failed to get JMA tile URLs within hours:', error);
		return [];
	}
}

/**
 * 使用例とテスト関数
 */
export async function exampleUsage() {
	try {
		console.log('=== 全てのタイルURL取得 ===');
		const allTiles = await getJmaTileUrls();
		console.log(`取得したタイル数: ${allTiles.length}`);
		allTiles.slice(0, 3).forEach((tile, index) => {
			console.log(`${index + 1}. ${tile.date.toLocaleString('ja-JP')} - ${tile.url}`);
		});

		console.log('\n=== 最新のタイルURL取得 ===');
		const latestTile = await getLatestJmaTileUrl();
		if (latestTile) {
			console.log(`最新: ${latestTile.date.toLocaleString('ja-JP')} - ${latestTile.url}`);
		}

		console.log('\n=== 1時間以内のタイルURL取得 ===');
		const recentTiles = await getJmaTileUrlsWithinHours(1);
		console.log(`1時間以内のタイル数: ${recentTiles.length}`);
	} catch (error) {
		console.error('Example usage failed:', error);
	}
}
