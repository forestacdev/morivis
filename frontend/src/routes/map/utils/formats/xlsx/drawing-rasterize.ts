import type { GeoRefData } from '$routes/map/components/upload/form/transform/georef-types';

import type { XlsxDrawingAppearance } from './drawing-appearance';

/** Bake text and embedded pictures into a transparent PNG before leaving the form. */
export const drawingAppearanceToGeoRefData = async (
	appearance: XlsxDrawingAppearance,
	entryName: string
): Promise<GeoRefData> => {
	if (!appearance.svg || appearance.width <= 0 || appearance.height <= 0) {
		throw new Error('読み込める図面がありません');
	}
	const scale = Math.min(
		2,
		4096 / Math.max(appearance.width, appearance.height),
		Math.sqrt(8_000_000 / (appearance.width * appearance.height))
	);
	const width = Math.max(1, Math.round(appearance.width * scale));
	const height = Math.max(1, Math.round(appearance.height * scale));
	const url = URL.createObjectURL(new Blob([appearance.svg], { type: 'image/svg+xml' }));
	try {
		await document.fonts.ready;
		const image = new Image();
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error('Excel図面の画像を生成できませんでした'));
			image.src = url;
		});
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('キャンバスの初期化に失敗しました');
		context.drawImage(image, 0, 0, width, height);
		const pngUrl = canvas.toDataURL('image/png');
		const blob = await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob((result) => {
				if (result) resolve(result);
				else reject(new Error('Excel図面の画像を保存できませんでした'));
			}, 'image/png')
		);
		const pixels = context.getImageData(0, 0, width, height).data;
		const bands = [0, 1, 2].map((channel) => {
			const band = new Uint8Array(width * height);
			for (let index = 0; index < band.length; index++) {
				band[index] = pixels[index * 4 + channel];
			}
			return band;
		});
		const range = { min: 0, max: 255 };
		return {
			sourceType: 'raster',
			entryId: `xlsx_image_${crypto.randomUUID()}`,
			entryName,
			parsedBands: bands,
			parsedNodata: null,
			dataRanges: bands.map(() => ({ ...range })),
			numBands: 3,
			imageWidth: width,
			imageHeight: height,
			bandMinMax: { ...range },
			multiBandMinMax: { r: { ...range }, g: { ...range }, b: { ...range } },
			imageFile: new File([blob], `${entryName}.png`, { type: 'image/png' }),
			previewImageUrl: pngUrl,
			rasterImage: { url: pngUrl, attribution: 'Excel' },
			registrationMode: 'raster',
			allowRegistrationModeChange: false
		};
	} finally {
		URL.revokeObjectURL(url);
	}
};
