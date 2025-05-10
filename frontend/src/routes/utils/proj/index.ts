import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

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

export const convertCoordinatesToGeojson = async (
	geojson: FeatureCollection<Geometry, GeoJsonProperties>,
	prjContent: string
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> => {
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

		worker.onmessage = (event) => {
			resolve(event.data as FeatureCollection<Geometry, GeoJsonProperties>);
			worker.terminate(); // Worker を終了
			return geojson;
		};

		worker.onerror = (error) => {
			reject(error);
			worker.terminate(); // Worker を終了
		};

		// Worker に処理に必要なデータを送信
		worker.postMessage({ geojson, prjContent });
	});
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
	return new Promise((resolve, reject) => {
		const featuresToProcess = geojson.features;
		const totalFeatures = featuresToProcess.length;
		const transformedFeatures: FeatureCollection<Geometry, GeoJsonProperties>['features'] = [];
		let featuresProcessed = 0;
		let nextFeatureIndex = 0;

		if (totalFeatures === 0) {
			resolve({ type: 'FeatureCollection', features: [] });
			return;
		}

		const workers: Worker[] = [];
		const availableWorkerQueue: Worker[] = []; // 利用可能なワーカーのインデックスを管理

		const onWorkerMessage = (event: MessageEvent) => {
			const { type, transformedFeature, featureIndex: processedFeatureIndex, error } = event.data;

			if (type === 'TRANSFORMED_FEATURE') {
				transformedFeatures.push(transformedFeature);
			} else if (type === 'ERROR') {
				console.error(
					`Error processing feature (original index ${processedFeatureIndex}): ${error}`
				);
				// エラーが発生したfeatureも処理済みとしてカウントする（またはエラー処理戦略に応じて変更）
			}

			featuresProcessed++;
			// console.log(`Main: Feature ${processedFeatureIndex} processed. Total processed: ${featuresProcessed}/${totalFeatures}`);

			// このワーカーを再度利用可能にする
			const workerInstance = event.target; // イベントを発行したワーカーインスタンス

			availableWorkerQueue.push(workerInstance as Worker); // 利用可能なワーカーキューに追加

			// まだ処理すべきfeatureがあり、利用可能なワーカーがあれば次のタスクを割り当てる
			if (nextFeatureIndex < totalFeatures && availableWorkerQueue.length > 0) {
				const workerToUse = availableWorkerQueue.shift(); // キューからワーカーを取得
				// console.log(`Main: Assigning feature ${nextFeatureIndex} to a worker.`);

				if (!workerToUse) {
					console.error('No available worker found.');
					return;
				}
				workerToUse.postMessage({
					feature: featuresToProcess[nextFeatureIndex],
					prjContent: prjContent,
					featureIndex: nextFeatureIndex // デバッグや追跡のため
				});
				nextFeatureIndex++;
			}

			if (featuresProcessed === totalFeatures) {
				// console.log('Main: All features processed.');
				workers.forEach((worker) => worker.terminate()); // 全ワーカーを終了
				resolve({
					type: 'FeatureCollection',
					features: transformedFeatures
				});
			}
		};

		const onWorkerError = (event: ErrorEvent) => {
			console.error('Main: Worker error caught by onerror:');
			console.error(`  Message: ${event.message}`);
			console.error(`  Filename: ${event.filename}`);
			console.error(`  Lineno: ${event.lineno}`);
			console.error(`  Colno: ${event.colno}`);
			if (event.error) {
				console.error('  Error object:', event.error);
			}

			workers.forEach((w) => w.terminate());
			// event.message を使うか、event.error が Error インスタンスならその message を使う
			const errorMessage = event.error instanceof Error ? event.error.message : event.message;
			reject(new Error(`Worker failed: ${errorMessage}`));
		};

		for (let i = 0; i < NUM_WORKERS; i++) {
			// transformer.worker.js のパスは実際のプロジェクト構造に合わせてください
			const worker = new Worker(new URL('./transformer.worker.ts', import.meta.url), {
				type: 'module'
			});
			worker.onmessage = onWorkerMessage;
			worker.onerror = onWorkerError;
			workers.push(worker);
			availableWorkerQueue.push(worker); // 初期状態では全てのワーカーが利用可能
		}

		// 最初のタスクを割り当てる
		for (let i = 0; i < Math.min(NUM_WORKERS, totalFeatures); i++) {
			if (availableWorkerQueue.length > 0) {
				const workerToUse = availableWorkerQueue.shift();
				// console.log(`Main: Assigning initial feature ${nextFeatureIndex} to a worker.`);
				if (!workerToUse) {
					console.error('No available worker found.');
					return;
				}
				workerToUse.postMessage({
					feature: featuresToProcess[nextFeatureIndex],
					prjContent: prjContent,
					featureIndex: nextFeatureIndex
				});
				nextFeatureIndex++;
			}
		}
	});
};
