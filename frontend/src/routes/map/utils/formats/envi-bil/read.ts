import { MAX_HEADER_BYTES, MAX_RAW_RASTER_BYTES, parseRawRaster, parseRawRasterHeader } from '.';
import type { RawRasterFiles } from './files';

export const readRawRasterFiles = async (files: RawRasterFiles) => {
	const { header, data: image, prj, world } = files;
	if (
		header.size > MAX_HEADER_BYTES || (prj?.size ?? 0) > MAX_HEADER_BYTES
		|| (world?.size ?? 0) > MAX_HEADER_BYTES
	) throw new Error('HDR・PRJ・ワールドファイルは1 MiB以下にしてください');
	if (image.size > MAX_RAW_RASTER_BYTES) {
		throw new Error('画像本体は512 MiB以下にしてください');
	}
	const parsed = parseRawRasterHeader(await header.text());
	if (prj) parsed.crs = (await prj.text()).trim() || parsed.crs;
	if (!parsed.transform && world) {
		const values = (await world.text()).trim().split(/\s+/).map(Number);
		if (values.length !== 6 || !values.every(Number.isFinite)) {
			throw new Error('ワールドファイルが不正です');
		}
		const [a, d, b, e, x, y] = values;
		parsed.transform = [x - (a + b) / 2, a, b, y - (d + e) / 2, d, e];
	}
	return parseRawRaster(parsed, await image.arrayBuffer());
};
