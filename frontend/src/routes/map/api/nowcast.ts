// https://www.jma.go.jp/jma/kishou/know/kurashi/highres_nowcast.html
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import { createRasterEntry } from '$routes/map/data/entries/raster';
import type { RasterBaseMapStyle, MorivisRasterEntry, TileXYZ } from '$routes/map/data/types/raster';
import type { Tag } from '$routes/map/data/types/tags';

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

export interface JmaNowcastConfig {
	id: string;
	name: string;
	description: string;
	tags?: Tag[];
	xyzImageTile?: TileXYZ;
	downloadUrl?: string;
	mapImage?: string;
}

let jmaTileUrlsPromise: Promise<TileInfo[]> | null = null;

const getCurrentNowcastFallbackBasetime = () => {
	const formatter = new Intl.DateTimeFormat('ja-JP', {
		timeZone: 'Asia/Tokyo',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	});

	const parts = formatter.formatToParts(new Date());
	const getPart = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? '';

	const minute = getPart('minute');
	const roundedMinute = String(Math.floor(Number(minute) / 5) * 5).padStart(2, '0');

	return `${getPart('year')}${getPart('month')}${getPart('day')}${
		getPart('hour')
	}${roundedMinute}00`;
};

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
	if (!jmaTileUrlsPromise) {
		jmaTileUrlsPromise = (async () => {
			try {
				const response = await fetch(
					'https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N1.json'
				);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data: unknown = await response.json();
				if (!Array.isArray(data)) {
					throw new Error('Invalid data format: expected array');
				}

				const tileInfos: TileInfo[] = data
					.map((item) => {
						if (!item || typeof item !== 'object') return null;
						const basetime = (item as { basetime?: unknown; }).basetime;
						return typeof basetime === 'string' ? basetime : null;
					})
					.filter((basetime): basetime is string => basetime !== null)
					.sort()
					.reverse()
					.map((basetime: string) => {
						const date = parseBasetime(basetime);
						if (!date) return null;

						return {
							url: `https://www.jma.go.jp/bosai/jmatile/data/nowc/${basetime}/none/${basetime}/surf/hrpns/{z}/{x}/{y}.png`,
							timestamp: date.getTime(),
							date,
							basetime
						};
					})
					.filter((item): item is TileInfo => item !== null);

				return tileInfos;
			} catch (error) {
				jmaTileUrlsPromise = null;
				console.error('Failed to fetch JMA tile URLs:', error);
				throw new Error(
					`Failed to fetch JMA tile URLs: ${
						error instanceof Error ? error.message : 'Unknown error'
					}`
				);
			}
		})();
	}

	return jmaTileUrlsPromise;
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

const formatNowcastTimeLabel = (basetime: string) => {
	const year = basetime.slice(0, 4);
	const month = basetime.slice(4, 6);
	const day = basetime.slice(6, 8);
	const hour = basetime.slice(8, 10);
	const minute = basetime.slice(10, 12);
	return `${year}/${month}/${day} ${hour}:${minute} JST`;
};

const createNowcastTileUrl = (basetime: string) =>
	`https://www.jma.go.jp/bosai/jmatile/data/nowc/${basetime}/none/${basetime}/surf/hrpns/{z}/{x}/{y}.png`;

const createFixedNowcastTileUrl = (basetime: string, tileZoom: number) =>
	`https://www.jma.go.jp/bosai/jmatile/data/nowc/${basetime}/none/${basetime}/surf/hrpns/${tileZoom}/{x}/{y}.png`;

// NOTE: 高解像度降水ナウキャストは、ズームレベル 4, 6, 8 でタイルが提供されている
const attachNowcastZoomSplitLayers = (entry: MorivisRasterEntry<RasterBaseMapStyle>) => {
	entry.format.url = createFixedNowcastTileUrl('{morivis:dimension}', 8);
	entry.metaData.minZoom = 8;
	entry.metaData.maxZoom = 8;
	entry.style.minZoom = 8;
	entry.style.maxZoom = 24;
	entry.auxiliaryLayers = {
		sources: {
			[`${entry.id}:::z4_source`]: {
				type: 'raster',
				tiles: [createFixedNowcastTileUrl('{morivis:dimension}', 4)],
				tileSize: 256,
				minzoom: 4,
				maxzoom: 4,
				bounds: WEB_MERCATOR_JAPAN_BOUNDS
			},
			[`${entry.id}:::z6_source`]: {
				type: 'raster',
				tiles: [createFixedNowcastTileUrl('{morivis:dimension}', 6)],
				tileSize: 256,
				minzoom: 6,
				maxzoom: 6,
				bounds: WEB_MERCATOR_JAPAN_BOUNDS
			}
		},
		layers: [
			{
				id: `${entry.id}:::z4_layer`,
				type: 'raster',
				source: `${entry.id}:::z4_source`,
				minzoom: 4,
				maxzoom: 6
			},
			{
				id: `${entry.id}:::z6_layer`,
				type: 'raster',
				source: `${entry.id}:::z6_source`,
				minzoom: 6,
				maxzoom: 8
			}
		]
	};
};

export const createJmaNowcastRasterEntry = async (
	config: JmaNowcastConfig
): Promise<MorivisRasterEntry<RasterBaseMapStyle>> => {
	const tiles = await getJmaTileUrls();
	const basetimes = tiles.map((tile) => tile.basetime);

	if (basetimes.length === 0) {
		throw new Error('高解像度降水ナウキャストの時刻一覧を取得できませんでした');
	}

	const entry = createRasterEntry(config.name, createNowcastTileUrl('{morivis:dimension}'), {
		tileSize: 256,
		minZoom: 4,
		maxZoom: 8,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		timeDimension: {
			values: basetimes,
			labels: basetimes.map(formatNowcastTimeLabel)
		}
	});

	entry.id = config.id;
	entry.metaData.name = config.name;
	entry.metaData.description = config.description;
	entry.metaData.attribution = '気象庁';
	entry.metaData.location = '全国';
	entry.metaData.tags = config.tags ?? ['気象', '雨雲'];
	entry.metaData.xyzImageTile = config.xyzImageTile ?? { x: 7, y: 3, z: 4 };
	entry.metaData.downloadUrl = config.downloadUrl;
	entry.metaData.mapImage = config.mapImage;
	attachNowcastZoomSplitLayers(entry);

	return entry;
};

export const createJmaNowcastFallbackEntry = (
	config: JmaNowcastConfig
): MorivisRasterEntry<RasterBaseMapStyle> => {
	const fallbackBasetime = getCurrentNowcastFallbackBasetime();
	const entry = createRasterEntry(config.name, createNowcastTileUrl('{morivis:dimension}'), {
		tileSize: 256,
		minZoom: 4,
		maxZoom: 9,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		timeDimension: {
			values: [fallbackBasetime],
			labels: [formatNowcastTimeLabel(fallbackBasetime)]
		}
	});

	entry.id = config.id;
	entry.metaData.name = config.name;
	entry.metaData.description = config.description;
	entry.metaData.attribution = '気象庁';
	entry.metaData.location = '全国';
	entry.metaData.tags = config.tags ?? ['地図'];
	entry.metaData.xyzImageTile = config.xyzImageTile ?? { x: 7, y: 3, z: 4 };
	entry.metaData.downloadUrl = config.downloadUrl;
	entry.metaData.mapImage = config.mapImage;
	attachNowcastZoomSplitLayers(entry);

	return entry;
};

export const loadJmaNowcastRasterEntry = async (
	config: JmaNowcastConfig
): Promise<MorivisRasterEntry<RasterBaseMapStyle>> => {
	try {
		return await createJmaNowcastRasterEntry(config);
	} catch (error) {
		console.error(`${config.name}エントリの初期化に失敗しました`, error);
		return createJmaNowcastFallbackEntry(config);
	}
};
