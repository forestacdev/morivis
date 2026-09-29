import initGdalJs from 'gdal3.js';
import dataUrl from 'gdal3.js/dist/package/gdal3WebAssembly.data?url';
import wasmUrl from 'gdal3.js/dist/package/gdal3WebAssembly.wasm?url';
import { convertOsmPbf } from '.';
import { validateOsmPbfFile } from './files';
import { OSM_PBF_GDAL_ENV } from './gdal-config';

self.onmessage = async ({ data: file }: MessageEvent<File>) => {
	try {
		await validateOsmPbfFile(file);
		let failure = '';
		const gdal = await initGdalJs({
			useWorker: false,
			paths: { wasm: wasmUrl, data: dataUrl },
			env: OSM_PBF_GDAL_ENV,
			logHandler: () => {},
			errorHandler: message => {
				if (/ERROR|Parsing error|An error occurred/i.test(message)) failure = message;
			}
		});
		const result = await convertOsmPbf(gdal, new File([file], 'input.osm.pbf'), () => {
			if (failure) throw new Error(`OSM PBFを解析できませんでした: ${failure}`);
		});
		postMessage({ result });
	} catch (error) {
		postMessage({
			error: error instanceof Error ? error.message : 'OSM PBFの読み込みに失敗しました'
		});
	}
};
