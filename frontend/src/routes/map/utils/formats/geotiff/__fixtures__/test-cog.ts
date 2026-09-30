/** メタ情報と画素領域を離した架空TIFF。画素領域の内容は判定に使わない。 */
export const createTestCog = (
	{
		big = false,
		little = true,
		tiled = true,
		georeferenced = true,
		overview = true,
		small = false
	} = {}
) => {
	const pixelOffset = 128 * 1024;
	const size = small ? 16 : 1024;
	const buffer = new ArrayBuffer(pixelOffset + size * size + 256 * 256);
	const view = new DataView(buffer);
	const put16 = (offset: number, value: number) => view.setUint16(offset, value, little);
	const put32 = (offset: number, value: number) => view.setUint32(offset, value, little);
	const put64 = (offset: number, value: number) =>
		view.setBigUint64(offset, BigInt(value), little);
	put16(0, little ? 0x4949 : 0x4d4d);
	put16(2, big ? 43 : 42);
	if (big) {
		put16(4, 8);
		put64(8, 16);
	} else put32(4, 8);
	[1, 1, 0].forEach((v, i) => view.setFloat64(1024 + i * 8, v, little));
	[0, 0, 0, 0, size, 0].forEach((v, i) => view.setFloat64(1056 + i * 8, v, little));
	[1, 1, 0, 1, 2048, 0, 1, 4326].forEach((v, i) => put16(1104 + i * 2, v));
	const writeIfd = (
		offset: number,
		width: number,
		dataOffset: number,
		next: number,
		reduced: boolean
	) => {
		// tag, type, count, value（または配列へのオフセット）
		const tags = [
			[254, 4, 1, reduced ? 1 : 0],
			[256, 4, 1, width],
			[257, 4, 1, width],
			[258, 3, 1, 8],
			[259, 3, 1, 1],
			[262, 3, 1, 1],
			[277, 3, 1, 1],
			...(tiled
				? [[322, 4, 1, width], [323, 4, 1, width], [324, 4, 1, dataOffset], [
					325,
					4,
					1,
					width * width
				]]
				: [[273, 4, 1, dataOffset], [278, 4, 1, width], [279, 4, 1, width * width]]),
			...(georeferenced
				? [[33550, 12, 3, 1024], [33922, 12, 6, 1056], [34735, 3, 8, 1104]]
				: [])
		].sort((a, b) => a[0] - b[0]);
		if (big) put64(offset, tags.length);
		else put16(offset, tags.length);
		tags.forEach(([tag, type, count, value], i) => {
			const p = offset + (big ? 8 : 2) + i * (big ? 20 : 12);
			put16(p, tag);
			put16(p + 2, type);
			if (big) put64(p + 4, count);
			else put32(p + 4, count);
			const slot = p + (big ? 12 : 8);
			if (count === 1) {
				if (type === 3) put16(slot, value);
				else put32(slot, value);
			} else if (big) put64(slot, value);
			else put32(slot, value);
		});
		const tail = offset + (big ? 8 : 2) + tags.length * (big ? 20 : 12);
		if (big) put64(tail, next);
		else put32(tail, next);
	};
	writeIfd(big ? 16 : 8, size, pixelOffset, overview ? 512 : 0, false);
	if (overview) writeIfd(512, 256, pixelOffset + size * size, 0, true);
	return { buffer, pixelOffset };
};
