import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { createRasterEntry } from '$routes/map/data/entries/raster';
import type { RasterBaseMapStyle, MorivisRasterEntry, TileXYZ } from '$routes/map/data/types/raster';
import type { Tag } from '$routes/map/data/types/tags';

export interface HimawariTargetTime {
	basetime: string;
	validtime: string;
}

export interface HimawariProductConfig {
	id: string;
	name: string;
	band: string;
	prod: string;
	description: string;
	tags?: Tag[];
	xyzImageTile?: TileXYZ;
	downloadUrl?: string;
	mapImage?: string;
}

const HIMAWARI_FALLBACK_BASETIME = '20260515150000';

const isHimawariTargetTime = (value: unknown): value is HimawariTargetTime => {
	if (!value || typeof value !== 'object') return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.basetime === 'string'
		&& typeof record.validtime === 'string'
		&& /^\d{14}$/.test(record.basetime)
		&& /^\d{14}$/.test(record.validtime)
	);
};

// Himawariの衛星画像の取得
let himawariSatimgTimesPromise: Promise<HimawariTargetTime[]> | null = null;

export const getHimawariSatimgTimes = async (): Promise<HimawariTargetTime[]> => {
	if (!himawariSatimgTimesPromise) {
		himawariSatimgTimesPromise = (async () => {
			try {
				const response = await fetch(
					'https://www.jma.go.jp/bosai/himawari/data/satimg/targetTimes_fd.json'
				);
				if (!response.ok) {
					throw new Error(`HTTP error! Status: ${response.status}`);
				}
				const json: unknown = await response.json();
				if (!Array.isArray(json)) {
					throw new Error('Himawari target times response is not an array');
				}

				return json.filter(isHimawariTargetTime);
			} catch (error) {
				himawariSatimgTimesPromise = null;
				if (error instanceof Error) {
					throw new Error(
						`Failed to fetch Himawari satellite image times: ${error.message}`
					);
				}
				throw new Error(
					'Unknown error occurred while fetching Himawari satellite image times'
				);
			}
		})();
	}

	return himawariSatimgTimesPromise;
};

const normalizeHimawariBasetimes = (data: HimawariTargetTime[]): string[] => {
	return [...new Set(data.map((item) => item.basetime))].sort((a, b) => Number(b) - Number(a));
};

const formatHimawariTimeLabel = (basetime: string) => {
	const year = basetime.slice(0, 4);
	const month = basetime.slice(4, 6);
	const day = basetime.slice(6, 8);
	const hour = basetime.slice(8, 10);
	const minute = basetime.slice(10, 12);
	return `${year}/${month}/${day} ${hour}:${minute} JST`;
};

export const getHimawariImageUrl = (basetime: string | number, band = 'B13', prod = 'TBB') => {
	const basetimeText = String(basetime);
	const url =
		`https://www.jma.go.jp/bosai/himawari/data/satimg/${basetimeText}/fd/${basetimeText}/${band}/${prod}/{z}/{x}/{y}.jpg`;
	return url;
};

export const createHimawariRasterEntry = async (
	config: HimawariProductConfig
): Promise<MorivisRasterEntry<RasterBaseMapStyle>> => {
	const times = await getHimawariSatimgTimes();
	const basetimes = normalizeHimawariBasetimes(times);

	if (basetimes.length === 0) {
		throw new Error('ひまわりの時刻一覧を取得できませんでした');
	}

	const entry = createRasterEntry(
		config.name,
		getHimawariImageUrl('{morivis:dimension}', config.band, config.prod),
		{
			tileSize: 256,
			minZoom: 0,
			maxZoom: 8,
			bounds: WEB_MERCATOR_WORLD_BBOX,
			timeDimension: {
				values: basetimes,
				labels: basetimes.map(formatHimawariTimeLabel)
			}
		}
	);

	entry.id = config.id;
	entry.metaData.name = config.name;
	entry.metaData.description = config.description;
	entry.metaData.attribution = '気象庁';
	entry.metaData.location = '世界';
	entry.metaData.tags = config.tags ?? ['写真'];
	entry.metaData.xyzImageTile = config.xyzImageTile ?? { x: 7, y: 3, z: 3 };
	entry.metaData.downloadUrl = config.downloadUrl;
	entry.metaData.mapImage = config.mapImage;

	return entry;
};

export const createHimawariFallbackEntry = (
	config: HimawariProductConfig
): MorivisRasterEntry<RasterBaseMapStyle> => {
	const entry = createRasterEntry(
		config.name,
		getHimawariImageUrl('{morivis:dimension}', config.band, config.prod),
		{
			tileSize: 256,
			minZoom: 0,
			maxZoom: 8,
			bounds: WEB_MERCATOR_WORLD_BBOX,
			timeDimension: {
				values: [HIMAWARI_FALLBACK_BASETIME],
				labels: [formatHimawariTimeLabel(HIMAWARI_FALLBACK_BASETIME)]
			}
		}
	);

	entry.id = config.id;
	entry.metaData.name = config.name;
	entry.metaData.description = config.description;
	entry.metaData.attribution = '気象庁';
	entry.metaData.location = '世界';
	entry.metaData.tags = config.tags ?? ['写真'];
	entry.metaData.xyzImageTile = config.xyzImageTile ?? { x: 7, y: 3, z: 3 };
	entry.metaData.downloadUrl = config.downloadUrl;
	entry.metaData.mapImage = config.mapImage;

	return entry;
};

export const loadHimawariRasterEntry = async (
	config: HimawariProductConfig
): Promise<MorivisRasterEntry<RasterBaseMapStyle>> => {
	try {
		return await createHimawariRasterEntry(config);
	} catch (error) {
		console.error(`${config.name}エントリの初期化に失敗しました`, error);
		return createHimawariFallbackEntry(config);
	}
};
