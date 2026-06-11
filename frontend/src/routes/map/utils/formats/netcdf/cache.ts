/**
 * NetCDFデータの遅延エンコード用キャッシュ
 * entryIdに紐づけてNetCDFReaderとメタ情報を保持し、
 * 時間ステップ切り替え時にデータを再抽出・再エンコードする
 */
import { type BandDataRange, GeoTiffCache } from '$routes/map/utils/cache/raster/geotiff-cache';
import type { NetCDFReader } from 'netcdfjs';
import { encodeAllBandsToTerrarium, getMinMax, type RasterBands } from '../geotiff';
import type { NetCDFInfo } from './index';
import { extractRasterData } from './index';

interface NetCDFCacheEntry {
	reader: NetCDFReader;
	info: NetCDFInfo;
	variableName: string;
	/** time以外の固定スライスインデックス */
	sliceIndices: Record<string, number>;
	/** 時間次元の名前 */
	timeDimName: string;
	width: number;
	height: number;
	nodata: number | null;
	/** 現在エンコード済みの時間インデックス */
	encodedTimeIndex: number;
	meshConfig?: {
		baseValue: number;
		heightScale: number;
		maxGridSize: number;
	};
}

export interface NetCDFTimeStepData {
	data: Float32Array;
	width: number;
	height: number;
	nodata: number | null;
	ranges: BandDataRange[];
}

const cache = new Map<string, NetCDFCacheEntry>();

const extractTimeStepData = (entry: NetCDFCacheEntry, timeIndex: number): NetCDFTimeStepData => {
	const sliceIndices = {
		...entry.sliceIndices,
		[entry.timeDimName]: timeIndex
	};

	const { data, width, height, nodata } = extractRasterData(
		entry.reader,
		entry.variableName,
		entry.info,
		sliceIndices
	);

	return {
		data,
		width,
		height,
		nodata,
		ranges: [getMinMax(data, nodata)]
	};
};

export const NetCDFDataCache = {
	set: (entryId: string, entry: NetCDFCacheEntry) => {
		cache.set(entryId, entry);
	},

	get: (entryId: string) => cache.get(entryId),

	has: (entryId: string) => cache.has(entryId),

	delete: (entryId: string) => {
		cache.delete(entryId);
	},

	getTimeStepData: (entryId: string, timeIndex: number): NetCDFTimeStepData | null => {
		const entry = cache.get(entryId);
		if (!entry) return null;
		return extractTimeStepData(entry, timeIndex);
	},

	/**
	 * 指定した時間インデックスのデータを抽出・エンコードしてGeoTiffCacheを更新する
	 * 既にそのインデックスでエンコード済みならスキップ
	 */
	updateTimeStep: async (entryId: string, timeIndex: number): Promise<boolean> => {
		const entry = cache.get(entryId);
		if (!entry) return false;
		if (entry.encodedTimeIndex === timeIndex) return false;
		const { data, width, height, nodata, ranges } = extractTimeStepData(entry, timeIndex);
		const bands: RasterBands = [data];
		GeoTiffCache.invalidateTextureTransfer(entryId);

		await encodeAllBandsToTerrarium(entryId, bands, width, height, nodata, ranges);

		GeoTiffCache.setSize(entryId, width, height);
		GeoTiffCache.setNumBands(entryId, 1);

		entry.encodedTimeIndex = timeIndex;

		return true;
	}
};
