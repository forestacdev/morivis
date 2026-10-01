import JSZip from 'jszip';

import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import { buildAuxXml, latToMercY, lngToMercX } from '$routes/map/utils/formats/raster/aux-xml';
import {
	createHomography,
	type GeoRefCorners
} from '$routes/map/utils/transform/georef/homography';

export const isExportableGeoreferencedImage = (
	entry: MorivisLayerEntry
): entry is RasterImageEntry<RasterBaseMapStyle> =>
	entry.type === 'raster' && entry.format.type === 'image' && entry.style.type === 'basemap'
	&& entry.metaData.isUserUploaded === true && !!entry.metaData.imageCorners
	&& /^(data:image\/png[;,]|blob:)/i.test(entry.format.url);

export const buildImageExportName = (name: string): string => {
	const clean = Array.from(name).filter((char) => char.charCodeAt(0) >= 32).join('')
		.replace(/[<>:"/\\|?*]/g, '_').replace(/\.png$/i, '').replace(/[.\s]+$/g, '').trim();
	return clean || 'drawing';
};

/** Resample the placed quad to north-up EPSG:3857, including its transparent margins. */
export const rectifyImage = async (
	pixels: Uint8ClampedArray,
	sourceWidth: number,
	sourceHeight: number,
	corners: GeoRefCorners
): Promise<
	{ pixels: Uint8ClampedArray; width: number; height: number; geoTransform: number[]; }
> => {
	if (sourceWidth < 1 || sourceHeight < 1 || pixels.length !== sourceWidth * sourceHeight * 4) {
		throw new Error('図面画像のサイズが不正です');
	}
	const projected = corners.map((
		[lng, lat]
	) => [lngToMercX(lng), latToMercY(lat)]) as GeoRefCorners;
	if (!projected.flat().every(Number.isFinite)) throw new Error('図面の位置情報が不正です');
	const minX = Math.min(...projected.map(([x]) => x));
	const maxX = Math.max(...projected.map(([x]) => x));
	const minY = Math.min(...projected.map(([, y]) => y));
	const maxY = Math.max(...projected.map(([, y]) => y));
	const spanX = maxX - minX;
	const spanY = maxY - minY;
	if (spanX <= 0 || spanY <= 0) throw new Error('図面の位置情報が不正です');
	const edge = (a: number, b: number) =>
		Math.hypot(projected[a][0] - projected[b][0], projected[a][1] - projected[b][1]);
	const resolution = Math.min(
		(edge(0, 1) + edge(3, 2)) / (2 * sourceWidth),
		(edge(0, 3) + edge(1, 2)) / (2 * sourceHeight)
	);
	const factor = Math.min(
		1 / resolution,
		4096 / Math.max(spanX, spanY),
		Math.sqrt(8_000_000 / (spanX * spanY))
	);
	const width = Math.max(1, Math.round(spanX * factor));
	const height = Math.max(1, Math.round(spanY * factor));
	// Work in normalized coordinates to avoid solving a matrix with large Mercator offsets.
	const normalized = projected.map((
		[x, y]
	) => [(x - minX) / spanX, (maxY - y) / spanY]) as GeoRefCorners;
	const inverse = createHomography(normalized, [[0, 0], [1, 0], [1, 1], [0, 1]]);
	const output = new Uint8ClampedArray(width * height * 4);
	for (let row = 0; row < height; row++) {
		if (row > 0 && row % 64 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
		const y = (row + 0.5) / height;
		for (let col = 0; col < width; col++) {
			const x = (col + 0.5) / width;
			const denominator = inverse.g * x + inverse.h * y + 1;
			if (Math.abs(denominator) < Number.EPSILON) continue;
			const u = (inverse.a * x + inverse.b * y + inverse.c) / denominator;
			const v = (inverse.d * x + inverse.e * y + inverse.f) / denominator;
			if (u < 0 || u > 1 || v < 0 || v > 1) continue;
			const sx = Math.max(0, Math.min(sourceWidth - 1, u * sourceWidth - 0.5));
			const sy = Math.max(0, Math.min(sourceHeight - 1, v * sourceHeight - 0.5));
			const ix = Math.floor(sx), iy = Math.floor(sy);
			const dx = sx - ix, dy = sy - iy;
			let alpha = 0, red = 0, green = 0, blue = 0;
			// Interpolate premultiplied colors so transparent pixels do not darken edges.
			for (let oy = 0; oy < 2; oy++) {
				for (let ox = 0; ox < 2; ox++) {
					const index = (Math.min(sourceHeight - 1, iy + oy) * sourceWidth
						+ Math.min(sourceWidth - 1, ix + ox)) * 4;
					const weight = (ox ? dx : 1 - dx) * (oy ? dy : 1 - dy) * pixels[index + 3];
					alpha += weight;
					red += pixels[index] * weight;
					green += pixels[index + 1] * weight;
					blue += pixels[index + 2] * weight;
				}
			}
			const offset = (row * width + col) * 4;
			if (alpha > 0) {
				output[offset] = red / alpha;
				output[offset + 1] = green / alpha;
				output[offset + 2] = blue / alpha;
				output[offset + 3] = alpha;
			}
		}
	}
	// GDAL GeoTransform uses the pixel corner, not the pixel center of a world file.
	return {
		pixels: output,
		width,
		height,
		geoTransform: [minX, spanX / width, 0, maxY, 0, -spanY / height]
	};
};

export const exportGeoreferencedImage = async (
	entry: RasterImageEntry<RasterBaseMapStyle>
): Promise<void> => {
	if (!isExportableGeoreferencedImage(entry)) {
		throw new Error('ダウンロードできる図面画像がありません');
	}
	const corners = entry.metaData.imageCorners!.map((point) => [...point]) as GeoRefCorners;
	const name = buildImageExportName(entry.metaData.name);
	const imageUrl = entry.format.url;
	const response = await fetch(imageUrl);
	if (!response.ok) throw new Error('図面画像を読み込めませんでした');
	const bitmap = await createImageBitmap(await response.blob());
	let source: ImageData;
	try {
		const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
		const context = canvas.getContext('2d');
		if (!context) throw new Error('図面画像を読み込めませんでした');
		context.drawImage(bitmap, 0, 0);
		source = context.getImageData(0, 0, bitmap.width, bitmap.height);
	} finally {
		bitmap.close();
	}
	const result = await rectifyImage(source.data, source.width, source.height, corners);
	const canvas = new OffscreenCanvas(result.width, result.height);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('図面画像を書き出せませんでした');
	const output = context.createImageData(result.width, result.height);
	output.data.set(result.pixels);
	context.putImageData(output, 0, 0);
	const png = await canvas.convertToBlob({ type: 'image/png' });
	const zip = new JSZip();
	zip.file(`${name}.png`, await png.arrayBuffer());
	zip.file(`${name}.png.aux.xml`, buildAuxXml(result.geoTransform, 3857));
	const url = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }));
	const link = document.createElement('a');
	try {
		link.href = url;
		link.download = `${name}.zip`;
		document.body.appendChild(link);
		link.click();
	} finally {
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
};
