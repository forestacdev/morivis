import type { BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
import { getMinMax, type RasterBands } from '$routes/map/utils/formats/geotiff';

const SVG_DIMENSION_PATTERN = /(?:^|\s)(width|height)\s*=\s*['"]([^'"]+)['"]/gi;
const SVG_VIEWBOX_PATTERN = /(?:^|\s)viewBox\s*=\s*['"]([^'"]+)['"]/i;

const SVG_LENGTH_UNIT_TO_PX: Record<string, number> = {
	px: 1,
	in: 96,
	cm: 96 / 2.54,
	mm: 96 / 25.4,
	pt: 96 / 72,
	pc: 16
};

const parseSvgLength = (value: string | undefined): number | null => {
	if (!value) return null;

	const normalized = value.trim().toLowerCase();
	const match = normalized.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(px|in|cm|mm|pt|pc)?$/);
	if (!match) return null;

	const numeric = Number(match[1]);
	if (!Number.isFinite(numeric) || numeric <= 0) return null;

	const unit = match[2] ?? 'px';
	return numeric * (SVG_LENGTH_UNIT_TO_PX[unit] ?? 1);
};

export const parseSvgDimensions = (svgText: string): { width: number; height: number } => {
	const sizeMap: Partial<Record<'width' | 'height', number>> = {};

	for (const match of svgText.matchAll(SVG_DIMENSION_PATTERN)) {
		const key = match[1] as 'width' | 'height';
		const parsed = parseSvgLength(match[2]);
		if (parsed) {
			sizeMap[key] = parsed;
		}
	}

	if (sizeMap.width && sizeMap.height) {
		return {
			width: Math.round(sizeMap.width),
			height: Math.round(sizeMap.height)
		};
	}

	const viewBoxMatch = svgText.match(SVG_VIEWBOX_PATTERN);
	if (viewBoxMatch) {
		const values = viewBoxMatch[1]
			.trim()
			.split(/[\s,]+/)
			.map((value) => Number(value));
		const width = values[2];
		const height = values[3];

		if (values.length === 4 && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
			return {
				width: Math.round(width),
				height: Math.round(height)
			};
		}
	}

	throw new Error('SVG の width / height または viewBox を解釈できませんでした');
};

const loadImage = async (src: string): Promise<HTMLImageElement> =>
	await new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('SVG画像の読み込みに失敗しました'));
		image.src = src;
	});

const canvasToPngBlob = async (canvas: HTMLCanvasElement): Promise<Blob> =>
	await new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) {
				resolve(blob);
				return;
			}

			reject(new Error('SVG の PNG 変換に失敗しました'));
		}, 'image/png');
	});

export const rasterizeSvgFile = async (
	file: File
): Promise<{
	width: number;
	height: number;
	bands: RasterBands;
	ranges: BandDataRange[];
	pngFile: File;
}> => {
	const svgText = await file.text();
	const { width, height } = parseSvgDimensions(svgText);
	const objectUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));

	try {
		const image = await loadImage(objectUrl);
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('Canvas context取得失敗');
		}

		context.drawImage(image, 0, 0, width, height);
		const imageData = context.getImageData(0, 0, width, height);
		const pixelCount = width * height;
		const rBand = new Uint8Array(pixelCount);
		const gBand = new Uint8Array(pixelCount);
		const bBand = new Uint8Array(pixelCount);

		for (let i = 0; i < pixelCount; i++) {
			rBand[i] = imageData.data[i * 4];
			gBand[i] = imageData.data[i * 4 + 1];
			bBand[i] = imageData.data[i * 4 + 2];
		}

		const bands: RasterBands = [rBand, gBand, bBand];
		const ranges = bands.map((band) => getMinMax(band, null));
		const pngBlob = await canvasToPngBlob(canvas);
		const pngFile = new File([pngBlob], file.name.replace(/\.svg$/i, '.png'), { type: 'image/png' });

		return {
			width,
			height,
			bands,
			ranges,
			pngFile
		};
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
};
