/**
 * NetCDFデータの遅延エンコード用キャッシュ
 * entryIdに紐づけてNetCDFReaderとメタ情報を保持し、
 * 時間ステップ切り替え時にデータを再抽出・再エンコードする
 */
import type { NetCDFReader } from 'netcdfjs';
import type { NetCDFInfo } from './netcdf';
import { extractRasterData } from './netcdf';
import {
	GeoTiffCache,
	encodeAllBandsToTerrarium,
	getMinMax,
	type BandDataRange,
	type RasterBands
} from './geotiff';

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
}

const cache = new Map<string, NetCDFCacheEntry>();

export const NetCDFDataCache = {
	set: (entryId: string, entry: NetCDFCacheEntry) => {
		cache.set(entryId, entry);
	},

	get: (entryId: string) => cache.get(entryId),

	has: (entryId: string) => cache.has(entryId),

	delete: (entryId: string) => {
		cache.delete(entryId);
	},

	/**
	 * 指定した時間インデックスのデータを抽出・エンコードしてGeoTiffCacheを更新する
	 * 既にそのインデックスでエンコード済みならスキップ
	 */
	updateTimeStep: async (entryId: string, timeIndex: number): Promise<boolean> => {
		const entry = cache.get(entryId);
		if (!entry) return false;
		if (entry.encodedTimeIndex === timeIndex) return false;

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

		const bands: RasterBands = [data];
		const ranges: BandDataRange[] = [getMinMax(data, nodata)];

		await encodeAllBandsToTerrarium(entryId, bands, width, height, nodata, ranges);

		GeoTiffCache.setSize(entryId, width, height);
		GeoTiffCache.setNumBands(entryId, 1);

		entry.encodedTimeIndex = timeIndex;

		return true;
	}
};
