import type { OpenJpeg } from '@cornerstonejs/codec-openjpeg/decodewasmjs';
import { rasterBounds } from '../envi-bil';
import type { RasterGrid } from '../raster/grid';
import { inspectCodestream, MAX_JP2_BYTES, parseJp2Container } from './boxes';
import type { Jp2Files } from './files';
import { readGeoJp2, readJp2Sidecars } from './metadata';

export const decodeJp2 = async (files: Jp2Files, codec: OpenJpeg): Promise<RasterGrid> => {
	if (files.image.size > MAX_JP2_BYTES) throw new Error('JP2は256 MiB以下にしてください');
	const container = parseJp2Container(await files.image.arrayBuffer());
	const header = inspectCodestream(container.codestream);
	const spatial = await readJp2Sidecars(await readGeoJp2(container.geoTiff), files);
	const { width, height, components, bits, signed } = header;
	const bbox = spatial.transform
		? rasterBounds(spatial.transform, width, height)
		: [0, 0, width, height] as [number, number, number, number];
	const decoder = new codec.J2KDecoder();
	try {
		decoder.getEncodedBuffer(container.codestream.length).set(container.codestream);
		decoder.decode();
		const frame = decoder.getFrameInfo();
		if (
			frame.width !== width || frame.height !== height || frame.componentCount !== components
			|| frame.bitsPerSample !== bits || frame.isSigned !== signed
		) throw new Error('JP2の復号結果とヘッダーが一致しません');
		const data = decoder.getDecodedBuffer(), bytesPerSample = bits <= 8 ? 1 : 2;
		if (data.length !== width * height * components * bytesPerSample) {
			throw new Error('JP2の復号結果が不正です');
		}
		const values = new DataView(data.buffer, data.byteOffset, data.byteLength);
		const sample = (i: number) =>
			bits <= 8
				? signed ? values.getInt8(i) : values.getUint8(i)
				: signed
				? values.getInt16(i * 2, true)
				: values.getUint16(i * 2, true);
		const bands = Array.from({ length: components }, () => new Float64Array(width * height));
		const ranges = bands.map(() => ({ min: Infinity, max: -Infinity }));
		for (let pixel = 0; pixel < width * height; pixel++) {
			for (let band = 0; band < components; band++) {
				const value = sample(pixel * components + band);
				bands[band][pixel] = value === spatial.nodata ? NaN : value;
				if (Number.isFinite(bands[band][pixel])) {
					ranges[band].min = Math.min(ranges[band].min, value);
					ranges[band].max = Math.max(ranges[band].max, value);
				}
			}
		}
		if (ranges.every(range => !Number.isFinite(range.min))) {
			throw new Error('JP2に有効な画素がありません');
		}
		return {
			width,
			height,
			bandCount: bands.length,
			bands,
			ranges: ranges.map(range =>
				!signed && (bands.length === 1 || bands.length === 3)
					? { min: 0, max: 2 ** bits - 1 }
					: Number.isFinite(range.min)
					? range
					: { min: 0, max: 1 }
			),
			bbox,
			transform: spatial.transform,
			crs: spatial.crs,
			defaultBands: bands.length >= 3 ? [0, 1, 2] : [0]
		};
	} finally {
		decoder.delete();
	}
};
