import { transformGeoJSONParallel } from '$routes/map/utils/proj';
import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';
import type { FeatureCollection } from 'geojson';
import { assertInputResourceLimits, FORMAT_RESOURCE_LIMITS } from '../resource-limits';
import { type BdsParseResult } from '.';
import type { BdsWorkerResponse } from './worker';
import BdsWorker from './worker?worker';

export const analyzeBdsFiles = async (files: File[]) => {
	if (!files.length) throw new Error('BDSファイルを選択してください');
	assertInputResourceLimits(
		files.map(file => ({ name: file.name, files: [file] })),
		FORMAT_RESOURCE_LIMITS.bds
	);
	const results: FeatureCollection[] = [];
	const emptyFiles: string[] = [];
	let totalFeatures = 0;
	for (const file of files) {
		try {
			const buffer = await file.arrayBuffer();
			const parsed = await runSingleShotWorker<
				ArrayBuffer,
				BdsWorkerResponse,
				BdsParseResult
			>(
				BdsWorker,
				buffer,
				{
					errorPrefix: 'BDS worker error',
					transfer: [buffer],
					mapResponse: response => {
						if ('error' in response) throw new Error(response.error);
						return response.result;
					}
				}
			);
			totalFeatures += parsed.geojson.features.length;
			if (totalFeatures > FORMAT_RESOURCE_LIMITS.bds.maxFeatures) {
				throw new Error('図形数の合計が50万件を超えています');
			}
			if (!parsed.geojson.features.length) emptyFiles.push(file.name);
			results.push(
				parsed.geojson.features.length
					? await transformGeoJSONParallel(parsed.geojson, parsed.proj4String)
					: parsed.geojson
			);
		} catch (error) {
			throw new Error(
				`${file.name}: ${error instanceof Error ? error.message : '読み込みに失敗しました'}`
			);
		}
	}
	if (!totalFeatures) throw new Error('BDSに表示できる図形がありません');
	const keys = new Set<string>();
	for (const result of results) {
		for (const feature of result.features) {
			for (const key of Object.keys(feature.properties ?? {})) keys.add(key);
		}
	}
	let sourceKey = 'BDSファイル';
	while (keys.has(sourceKey)) sourceKey += '_';
	const geojson: FeatureCollection = {
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
	return { geojson, emptyFiles };
};
