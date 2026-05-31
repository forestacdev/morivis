let _terrainDerivativesWorker: Worker | null = null;

const getTerrainDerivativesWorker = (): Worker => {
	if (!_terrainDerivativesWorker) {
		_terrainDerivativesWorker = new Worker(
			new URL('./terrain-derivatives.worker.ts', import.meta.url),
			{ type: 'module' }
		);
	}

	return _terrainDerivativesWorker;
};

export const terminateTerrainDerivativesWorker = () => {
	if (_terrainDerivativesWorker) {
		_terrainDerivativesWorker.terminate();
		_terrainDerivativesWorker = null;
	}
};

interface DerivedBandResult {
	band: Float32Array;
	min: number;
	max: number;
}

export const computeTerrainDerivatives = (
	band: Float32Array,
	width: number,
	height: number,
	nodata: number | null,
	ewres: number,
	nsres: number
): Promise<{
	slope: DerivedBandResult;
	aspect: DerivedBandResult;
	tpi: DerivedBandResult;
}> =>
	new Promise((resolve, reject) => {
		const worker = getTerrainDerivativesWorker();

		worker.postMessage({
			band,
			width,
			height,
			nodata,
			ewres,
			nsres
		});

		worker.onmessage = (event) => {
			const {
				slope,
				aspect,
				tpi,
				error
			} = event.data as {
				slope?: DerivedBandResult;
				aspect?: DerivedBandResult;
				tpi?: DerivedBandResult;
				error?: string;
			};

			if (error || !slope || !aspect || !tpi) {
				reject(new Error(error ?? '地形派生量の計算に失敗しました'));
				return;
			}

			resolve({ slope, aspect, tpi });
		};

		worker.onerror = (error) => {
			reject(new Error(`Terrain derivatives worker error: ${error.message}`));
		};
	});
