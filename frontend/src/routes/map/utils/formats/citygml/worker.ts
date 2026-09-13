import { type CityGmlLod, type CityGmlResult, cityGmlTextToGeoJson } from '.';

export interface CityGmlWorkerRequest {
	files: File[];
	lod: CityGmlLod;
}
export type CityGmlWorkerResponse = { result: CityGmlResult; } | { error: string; };

self.onmessage = async ({ data }: MessageEvent<CityGmlWorkerRequest>) => {
	try {
		let combined: CityGmlResult | null = null;
		// XMLのDOMを同時に保持しないよう、ファイル単位で変換する。
		for (const [index, file] of data.files.entries()) {
			let result: CityGmlResult;
			try {
				result = cityGmlTextToGeoJson(await file.text(), data.lod);
			} catch (error) {
				throw new Error(
					`${file.name}: ${error instanceof Error ? error.message : String(error)}`
				);
			}
			for (const feature of result.geojson.features) {
				feature.id = `${index}/${feature.id}`;
				feature.properties.sourceFile = file.name;
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
				combined.skippedBuildingCount += result.skippedBuildingCount;
			}
		}
		if (!combined) throw new Error('CityGMLファイルを選択してください');
		postMessage({ result: combined } satisfies CityGmlWorkerResponse);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies CityGmlWorkerResponse
		);
	}
};
