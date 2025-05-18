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

const rgbaImage = async (
	raster: Uint8Array,
	width: number,
	height: number
): Promise<ImageBitmap> => {
	// ラスターの高さと幅を取得

	const rgba = new Uint8ClampedArray(width * height * 4);

	// 例: rasterが1バンドのグレースケールUint8Arrayの場合
	for (let i = 0; i < width * height; i++) {
		const val = raster[i]; // 0-255
		rgba[i * 4 + 0] = val;
		rgba[i * 4 + 1] = val;
		rgba[i * 4 + 2] = val;
		rgba[i * 4 + 3] = 255; // α
	}

	const imageData = new ImageData(rgba, width, height);

	return await createImageBitmap(imageData);
};

export type BandType = 'single' | 'multi';

// ラスターデータの読み込み
export const loadRasterData = async (url: string) => {
	try {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		const tiff = await fromArrayBuffer(arrayBuffer);
		const image = await tiff.getImage();
		const bbox = image.getBoundingBox();

		// 座標系を取得

		// ラスターデータを取得
		const rasters = await image.readRasters({ interleave: false });

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
