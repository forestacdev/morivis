let _twiWorker: Worker | null = null;

const getTwiWorker = (): Worker => {
	if (!_twiWorker) {
		_twiWorker = new Worker(new URL('./twi.worker.ts', import.meta.url), {
			type: 'module'
		});
	}

	return _twiWorker;
};

export const terminateTwiWorker = () => {
	if (_twiWorker) {
		_twiWorker.terminate();
		_twiWorker = null;
	}
};

export const computeTwiBand = (
	band: Float32Array,
	width: number,
	height: number,
	nodata: number | null
): Promise<{ band: Float32Array; min: number; max: number }> =>
	new Promise((resolve, reject) => {
		const worker = getTwiWorker();

		worker.postMessage({
			band,
			width,
			height,
			nodata
		});

		worker.onmessage = (event) => {
			const { band: twiBand, min, max, error } = event.data as {
				band?: Float32Array;
				min?: number;
				max?: number;
				error?: string;
			};

			if (error || !twiBand || min === undefined || max === undefined) {
				reject(new Error(error ?? 'TWI の計算に失敗しました'));
				return;
			}

			resolve({
				band: twiBand,
				min,
				max
			});
		};

		worker.onerror = (error) => {
			reject(new Error(`TWI worker error: ${error.message}`));
		};
	});
