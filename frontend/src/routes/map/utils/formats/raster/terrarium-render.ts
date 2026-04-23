let _renderWorker: Worker | null = null;

const getRenderWorker = (): Worker => {
	if (!_renderWorker) {
		_renderWorker = new Worker(new URL('../geotiff/terrarium_render.worker.ts', import.meta.url), {
			type: 'module'
		});
	}
	return _renderWorker;
};

export const terminateRenderWorker = () => {
	if (_renderWorker) {
		_renderWorker.terminate();
		_renderWorker = null;
	}
};

export const releaseRenderTexture = (entryId: string): boolean => {
	if (!_renderWorker) return false;

	_renderWorker.postMessage({ action: 'release', entryId });
	return true;
};

export const renderTerrarium = (workerMessage: Record<string, unknown>): Promise<Blob> =>
	new Promise((resolve, reject) => {
		const worker = getRenderWorker();

		worker.postMessage(workerMessage);

		worker.onmessage = (e) => {
			const { blob, error } = e.data;
			if (error) {
				reject(new Error(`Render worker error: ${error}`));
				return;
			}
			resolve(blob);
		};

		worker.onerror = (error) => {
			console.error('Render worker error:', error);
			reject(new Error(`Render worker error: ${error.message}`));
		};
	});
