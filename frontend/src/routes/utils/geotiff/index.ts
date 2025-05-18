import { fromArrayBuffer } from 'geotiff';
import { proj4Dict, citationDict } from '$routes/utils/proj/dict';
import { transformBbox } from '$routes/utils/proj';

export type BandType = 'single' | 'multi';

// ラスターデータの読み込み
export const loadRasterData = async (
	url: string
): Promise<
	| {
			url: string;
			bbox: [number, number, number, number];
	  }
	| undefined
> => {
	try {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		const tiff = await fromArrayBuffer(arrayBuffer);
		const image = await tiff.getImage();

		const { BitsPerSample, SampleFormat, PhotometricInterpretation } = image.fileDirectory;

		console.log('BitsPerSample:', image); // [8, 8, 8] や [16, 16, 16] など
		console.log('SampleFormat:', SampleFormat); // [1, 1, 1] = unsigned int, [3, 3, 3] = float
		console.log('PhotometricInterpretation:', PhotometricInterpretation); // 2 = RGB

		const geoKeys = image.geoKeys;
		let epsgCode: string | number | null = null;
		if (geoKeys) {
			// ① 明示的な EPSG コードがあるか確認
			if (geoKeys.ProjectedCSTypeGeoKey && geoKeys.ProjectedCSTypeGeoKey !== 32767) {
				epsgCode = geoKeys.ProjectedCSTypeGeoKey;
			} else if (geoKeys.GeographicTypeGeoKey && geoKeys.GeographicTypeGeoKey !== 32767) {
				epsgCode = geoKeys.GeographicTypeGeoKey;
			}
			// ② EPSGコードがなく、GTCitationGeoKey から判別できる場合
			else if (geoKeys.GTCitationGeoKey) {
				const citation = geoKeys.GTCitationGeoKey.trim();

				if (citationDict[citation]) {
					epsgCode = citationDict[citation];
				} else {
					console.warn(`Unknown citation string: "${citation}"`);
				}
			}
		} else {
			console.warn('No geoKeys found in the image.');
		}

		let bbox = image.getBoundingBox();

		if (epsgCode === '4326' || epsgCode === 4326 || epsgCode === null) {
			bbox = image.getBoundingBox();
		} else {
			const prjContent = proj4Dict[epsgCode];
			bbox = transformBbox(bbox, prjContent); // EPSG:4326に変換
		}

		console.log(bbox);

		// ラスターデータを取得
		const rasters = await image.readRasters({ interleave: false });

		const type = rasters.length > 1 ? 'multi' : 'single';

		let min = Infinity;
		let max = -Infinity;

		const band = rasters[0] as Float32Array;

		// nodataの取得
		const nodata =
			image.fileDirectory.GDAL_NODATA !== undefined
				? parseFloat(image.fileDirectory.GDAL_NODATA)
				: null;

		for (let i = 0; i < band.length; i++) {
			const value = band[i];

			const isValid =
				Number.isFinite(value) &&
				(nodata === null ||
					(!Number.isNaN(nodata) && value !== nodata) ||
					(Number.isNaN(nodata) && !Number.isNaN(value)));

			if (isValid) {
				min = Math.min(min, value);
				max = Math.max(max, value);
			}
		}

		console.log('min:', min);
		console.log('max:', max);

		return new Promise((resolve, reject) => {
			const worker = new Worker(new URL('./worker.ts', import.meta.url), {
				type: 'module'
			});

			worker.postMessage({
				rasters,
				type,
				min,
				max
			});

			// Define message handler once
			worker.onmessage = async (e) => {
				const { dataUrl } = e.data;

				resolve({
					url: dataUrl,
					bbox: bbox
				});

				worker.terminate(); // Workerを終了
			};

			// Added error handling
			worker.onerror = (error) => {
				console.error('Worker error:', error);
				reject(new Error(`Worker error: ${error.message}`));
				worker.terminate(); // Workerを終了
			};
		});
	} catch (error) {
		console.error(`Error processing image`, error);
	}
};
