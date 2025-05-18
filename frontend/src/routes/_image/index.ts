import { fromArrayBuffer } from 'geotiff';
import { epsgDict, citationDict } from '$routes/utils/proj/dict';
import { transformBbox } from '$routes/utils/proj';

const worker = new Worker(new URL('./worker.ts', import.meta.url), {
	type: 'module'
});

export type BandType = 'single' | 'multi';

// ラスターデータの読み込み
export const loadRasterData = async (url: string) => {
	try {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		const tiff = await fromArrayBuffer(arrayBuffer);
		const image = await tiff.getImage();

		const geoKeys = image.geoKeys;
		let epsgCode: string | null = null;
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

		console.log(epsgCode);

		if (epsgCode === '4326' || epsgCode === null) {
			bbox = image.getBoundingBox();
		} else {
			const epsgData = epsgDict[epsgCode as keyof typeof epsgDict];
			bbox = transformBbox(bbox, epsgData.proj4); // EPSG:4326に変換
		}

		// ラスターデータを取得
		const rasters = await image.readRasters({ interleave: false });

		console.log('rasters', rasters);

		const type = rasters.length > 1 ? 'multi' : 'single';

		return new Promise((resolve, reject) => {
			worker.postMessage({
				rasters,
				type
			});

			// Define message handler once
			worker.onmessage = async (e) => {
				const { dataUrl } = e.data;

				resolve({
					url: dataUrl,
					bbox: bbox
				});
			};

			// Added error handling
			worker.onerror = (error) => {
				console.error('Worker error:', error);
			};
		});
	} catch (error) {
		console.error(`Error processing image`, error);
	}
};
