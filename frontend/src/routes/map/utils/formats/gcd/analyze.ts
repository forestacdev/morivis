import { transformGeoJSONParallel } from '$routes/map/utils/proj';
import { getProjContext, isValidEpsg } from '$routes/map/utils/proj/dict';
import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';
import type { FeatureCollection } from 'geojson';
import { type GcdParseResult, MAX_GCD_BYTES } from '.';
import type { GcdWorkerResponse } from './worker';
import GcdWorker from './worker?worker';

/** ファイルごとの座標系で変換してから結合する。ひとつでも失敗したら登録しない。 */
export const analyzeGcdFiles = async (files: File[]): Promise<FeatureCollection> => {
	if (!files.length || files.length > 32) throw new Error('GCDは1〜32ファイルを選択してください');
	if (
		files.some(file => file.size > MAX_GCD_BYTES)
		|| files.reduce((sum, file) => sum + file.size, 0) > MAX_GCD_BYTES
	) {
		throw new Error('GCDの合計サイズは128 MB以下にしてください');
	}
	const results: FeatureCollection[] = [];
	for (const file of files) {
		try {
			const buffer = await file.arrayBuffer();
			const parsed = await runSingleShotWorker<
				ArrayBuffer,
				GcdWorkerResponse,
				GcdParseResult
			>(
				GcdWorker,
				buffer,
				{
					errorPrefix: 'GCD worker error',
					transfer: [buffer],
					mapResponse: response => {
						if ('error' in response) throw new Error(response.error);
						return response.result;
					}
				}
			);
			const epsg = parsed.crs.slice(5);
			if (!isValidEpsg(epsg)) throw new Error(`座標系 ${parsed.crs} には対応していません`);
			results.push(await transformGeoJSONParallel(parsed.geojson, getProjContext(epsg)));
		} catch (error) {
			throw new Error(
				`${file.name}: ${error instanceof Error ? error.message : '読み込みに失敗しました'}`
			);
		}
	}
	const keys = new Set(
		results.flatMap(result =>
			result.features.flatMap(feature => Object.keys(feature.properties ?? {}))
		)
	);
	let sourceKey = 'GCDファイル';
	while (keys.has(sourceKey)) sourceKey += '_';
	return {
		type: 'FeatureCollection',
		features: results.flatMap((result, index) =>
			result.features.map(feature => ({
				...feature,
				id: `${index}:${feature.id}`,
				properties: {
					...feature.properties,
					...(files.length > 1 ? { [sourceKey]: files[index].name } : {})
				}
			}))
		)
	};
};
