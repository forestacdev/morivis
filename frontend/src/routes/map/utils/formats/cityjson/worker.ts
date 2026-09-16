import { type CityJsonOptions, type CityJsonResult, cityJsonTextToGeoJson } from '.';

export interface CityJsonWorkerRequest {
	files: File[];
	options: CityJsonOptions;
}
export type CityJsonWorkerResponse = { result: CityJsonResult; } | { error: string; };

self.onmessage = async ({ data }: MessageEvent<CityJsonWorkerRequest>) => {
	try {
		let combined: CityJsonResult | null = null;
		// 大きなJSONを同時に保持しないよう、ファイル単位で変換する。
		for (const [index, file] of data.files.entries()) {
			let result: CityJsonResult;
			try {
				result = await cityJsonTextToGeoJson(await file.text(), data.options);
			} catch (error) {
				throw new Error(
					`${file.name}: ${error instanceof Error ? error.message : String(error)}`
				);
			}
			for (const feature of result.geojson.features) {
				feature.id = `${index}/${feature.id}`;
				feature.properties['cityjson:sourceFile'] = file.name;
			}
			if (!combined) combined = result;
			else {
				for (const feature of result.geojson.features) {
					combined.geojson.features.push(feature);
				}
				combined.bounds = [
					Math.min(combined.bounds[0], result.bounds[0]),
					Math.min(combined.bounds[1], result.bounds[1]),
					Math.max(combined.bounds[2], result.bounds[2]),
					Math.max(combined.bounds[3], result.bounds[3])
				];
				combined.polygonCount += result.polygonCount;
				combined.skippedGeometryCount += result.skippedGeometryCount;
				combined.hasAppearance ||= result.hasAppearance;
			}
		}
		if (!combined) throw new Error('CityJSONファイルを選択してください');
		postMessage({ result: combined } satisfies CityJsonWorkerResponse);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies CityJsonWorkerResponse
		);
	}
};
