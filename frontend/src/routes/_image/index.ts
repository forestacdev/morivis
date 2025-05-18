import { propData } from '$routes/data/propData';
import type { MapStyleImageMissingEvent } from 'maplibre-gl';
import { fromArrayBuffer } from 'geotiff';

const worker = new Worker(new URL('./worker.ts', import.meta.url), {
	type: 'module'
});

const loadImage = async (src: string): Promise<ImageBitmap> => {
	const response = await fetch(src);
	if (!response.ok) {
		throw new Error('Failed to fetch image');
	}
	const blob = await response.blob();
	return await createImageBitmap(blob);
};

// ラスターデータの読み込み
export const loadRasterData = async (url: string) => {
	try {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		const tiff = await fromArrayBuffer(arrayBuffer);
		const image = await tiff.getImage();

		// ラスターデータを取得
		const rasters = await image.readRasters();
		console.log(rasters);
		// const raster = rasters[0];
		const raster = await loadImage('https://cyberjapandata.gsi.go.jp/xyz/std/18/232801/103215.png');

		// ラスターの高さと幅を取得
		const width = image.getWidth();
		const height = image.getHeight();
		return new Promise((resolve, reject) => {
			worker.postMessage({ raster, width, height });

			// Define message handler once
			worker.onmessage = async (e) => {
				const { dataUrl } = e.data;

				resolve(dataUrl);
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
