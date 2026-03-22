import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import proj4 from 'proj4';

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

	return prjContent;
};

export const isWgs84Prj = (prjContent: string): boolean => {
	if (!prjContent) {
		return false;
	}

	const prjContentUpper = prjContent.toUpperCase();

	// WKT 形式の可能性をチェック
	if (
		prjContentUpper.includes('GCS_WGS_1984') &&
		prjContentUpper.includes('D_WGS_1984') &&
		prjContentUpper.includes('WGS_1984') &&
		prjContentUpper.includes('PRIMEM["GREENWICH"') &&
		prjContentUpper.includes('UNIT["DEGREE"')
	) {
		return true;
	}

	// PROJ.4 形式の可能性をチェック
	if (prjContentUpper.includes('+PROJ=LONGLAT') && prjContentUpper.includes('+DATUM=WGS84')) {
		return true;
	}

	return false;
};

// TODO
export const isWgs84Crs = (crs: any): boolean => {
	if (!crs) {
		return false; // CRS 情報がない場合
	}

	if (crs.type === 'name' && crs.properties && crs.properties.name) {
		const name = crs.properties.name;
		// よく使われる CRS 名を proj4 の定義に変換
		if (name === 'urn:ogc:def:crs:EPSG::4326' || name === 'EPSG:4326') {
			return true; // WGS84
		}
		// 他の CRS 名に対応する場合はここに追加
		// 例: if (name === 'urn:ogc:def:crs:OGC:1.3:CRS84') { ... }
	} else if (crs.type === 'proj4') {
		// PROJ.4 形式の場合
		const proj4Definition = crs.proj4;
		if (proj4Definition.includes('+proj=longlat') && proj4Definition.includes('+datum=WGS84')) {
			return true; // WGS84
		}
	} else if (crs.type === 'wkt') {
		// WKT 形式の場合
		const wktDefinition = crs.wkt;
		if (wktDefinition.includes('GCS_WGS_1984') && wktDefinition.includes('D_WGS_1984')) {
			return true; // WGS84
		}
	}
	// 他の CRS タイプに対応する場合はここに追加

	return false; // WGS84 ではない
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
			new Array(numWorkers);
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
