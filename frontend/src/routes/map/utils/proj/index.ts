import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import proj4 from 'proj4';

import { normalizePrjContent } from './crs-detect';

export {
	isWebMercatorPrj,
	isWgs84Crs,
	isWgs84Prj,
	normalizePrjContent
} from './crs-detect';

const readPrjFileBrowser = async (file: File) => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const result = e.target?.result;
			if (result == null || typeof result !== 'string') {
				return;
			}
			resolve(result.trim());
		};
		reader.onerror = (error) => {
			reject(error);
		};
		reader.readAsText(file);
	});
};

export const readPrjFileContent = async (prjFile: File) => {
	const prjContent = await readPrjFileBrowser(prjFile);

	if (typeof prjContent !== 'string') {
		throw new Error('Invalid PRJ file content');
	}

	return normalizePrjContent(prjContent);
};
const NUM_WORKERS = 4;

export const transformGeoJSONParallel = (
	geojson: FeatureCollection<Geometry, GeoJsonProperties>,
	prjContent: string
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> => {
	const features = geojson.features;
	const totalFeatures = features.length;

	if (totalFeatures === 0) {
		return Promise.resolve({ type: 'FeatureCollection', features: [] });
	}

	const numWorkers = Math.min(NUM_WORKERS, totalFeatures);
	const batchSize = Math.ceil(totalFeatures / numWorkers);

	return new Promise((resolve, reject) => {
		const resultBatches: FeatureCollection<Geometry, GeoJsonProperties>['features'][] =
			new Array(
				numWorkers
			);
		const workers: Worker[] = [];
		let completed = 0;
		let rejected = false;

		const cleanup = () => {
			workers.forEach((w) => w.terminate());
		};

		for (let i = 0; i < numWorkers; i++) {
			const start = i * batchSize;
			const end = Math.min(start + batchSize, totalFeatures);
			const batch = features.slice(start, end);

			const worker = new Worker(new URL('./transformer.worker.ts', import.meta.url), {
				type: 'module'
			});
			workers.push(worker);

			worker.onmessage = (e) => {
				if (rejected) return;
				if (e.data.type === 'TRANSFORMED_BATCH') {
					resultBatches[e.data.batchIndex] = e.data.transformedFeatures;
					completed++;
					if (completed === numWorkers) {
						cleanup();
						resolve({
							type: 'FeatureCollection',
							features: resultBatches.flat()
						});
					}
				} else if (e.data.type === 'ERROR') {
					rejected = true;
					cleanup();
					reject(new Error(e.data.error));
				}
			};

			worker.onerror = (e) => {
				if (rejected) return;
				rejected = true;
				cleanup();
				reject(new Error(e.message));
			};

			worker.postMessage({ features: batch, prjContent, batchIndex: i });
		}
	});
};

export const transformBbox = (
	bbox: [number, number, number, number],
	prjContent: string
): [number, number, number, number] => {
	// 左下と右上の座標を個別に変換
	const [minX, minY, maxX, maxY] = bbox;
	const [llX, llY] = proj4(prjContent, 'EPSG:4326', [minX, minY]);
	const [urX, urY] = proj4(prjContent, 'EPSG:4326', [maxX, maxY]);

	return [llX, llY, urX, urY];
};
