import { transformGeoJSONParallel } from '$routes/map/utils/proj';
import { getProjContext, isValidEpsg } from '$routes/map/utils/proj/dict';
import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';
import type { FeatureCollection } from 'geojson';
import { assertInputResourceLimits } from '../resource-limits';
import { type GcdParseResult } from '.';
import { formatGcd } from './definition';
import type { GcdWorkerResponse } from './worker';
import GcdWorker from './worker?worker';

/** ファイルごとの座標系で変換してから結合する。ひとつでも失敗したら登録しない。 */
export const analyzeGcdFiles = async (files: File[]): Promise<FeatureCollection> => {
	if (!files.length) throw new Error('GCDファイルを選択してください');
	assertInputResourceLimits(
		files.map(file => ({ name: file.name, files: [file] })),
		formatGcd.limits
	);
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
