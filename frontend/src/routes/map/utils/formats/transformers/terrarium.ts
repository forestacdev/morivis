import type { TypedArray } from 'geotiff';

let _encodeWorker: Worker | null = null;

const getEncodeWorker = (): Worker => {
	if (!_encodeWorker) {
		_encodeWorker = new Worker(new URL('../geotiff/terrarium_encode.worker.ts', import.meta.url), {
			type: 'module'
		});
	}
	return _encodeWorker;
};

/** エンコードWorkerを停止する（全エンコード完了後に呼ぶ） */
export const terminateEncodeWorker = () => {
	if (_encodeWorker) {
		_encodeWorker.terminate();
		_encodeWorker = null;
	}
};

/** 1バンドを Terrarium PNG にエンコードする */
export const encodeBandToTerrarium = (
	band: TypedArray,
	width: number,
	height: number,
	nodata: number | null,
	dataMin: number,
	dataMax: number
): Promise<Blob> =>
	new Promise((resolve, reject) => {
		const worker = getEncodeWorker();

		worker.postMessage({
			band,
			width,
			height,
			nodata,
			dataMin,
			dataMax
		});

		worker.onmessage = (e) => {
			const { blob, error } = e.data;
			if (error) {
				reject(new Error(`Encode error: ${error}`));
				return;
			}
			resolve(blob);
		};

		worker.onerror = (error) => {
			reject(new Error(`Encode worker error: ${error.message}`));
		};
	});

export const encodeBandsToTerrariumUrls = async (
	bands: TypedArray[],
	width: number,
	height: number,
	nodata: number | null,
	dataRanges: { min: number; max: number }[]
): Promise<string[]> => {
	const urls: string[] = [];

	for (let i = 0; i < bands.length; i++) {
		const blob = await encodeBandToTerrarium(
			bands[i],
			width,
			height,
			nodata,
			dataRanges[i].min,
			dataRanges[i].max
		);
		urls.push(URL.createObjectURL(blob));
	}

	terminateEncodeWorker();
	return urls;
};
