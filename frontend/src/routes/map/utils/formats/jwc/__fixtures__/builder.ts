// Synthetic document; byte positions are format constants, not user drawing data.
export const jwcFixture = (floatScales = false) => {
	const headerSize = floatScales ? 2421 : 2389;
	const pool = new Uint8Array([116, 101, 115, 116, 0]);
	const buffer = new ArrayBuffer(headerSize + 22 + 32 + 24 + pool.length + 12 + 2304);
	const b = new Uint8Array(buffer), v = new DataView(buffer), encoder = new TextEncoder();
	const put = (offset: number, text: string) => b.set(encoder.encode(text), offset);
	const f = (offset: number, value: number) => v.setFloat32(offset, value, true);
	const h = (offset: number, value: number) => v.setUint16(offset, value, true);
	const i = (offset: number, value: number) => v.setUint32(offset, value, true);
	put(
		0,
		floatScales
			? 'jw_cad(c)data.......a.f.m...............'
			: 'jw_cad(c)data.......a...m...............'
	);
	for (const offset of [199, 399, 599, 799]) b[offset] = 10;
	const fields = Array(32).fill('0');
	fields.splice(0, 5, '1', '1', '1', '1', '0');
	fields[9] = '50';
	fields[11] = '4';
	fields[30] = '518';
	put(200, fields.join(','));
	put(400, '0');
	put(600, '4000:0000,4000:0005');
	for (let n = 0; n < 11; n++) {
		h(1709 + 2 * n, 1);
		h(1731 + 2 * n, 20);
		h(1753 + 2 * n, 30);
		h(1775 + 2 * n, 5);
	}
	for (let g = 0; g < 16; g++) {
		if (floatScales) f(1797 + 4 * g, g === 1 ? 100 : 50);
		else h(1797 + 2 * g, g === 1 ? 100 : 50);
	}
	const visible = 1797 + (floatScales ? 64 : 32) + 272;
	b.fill(1, visible, visible + 272);
	b[visible + 1] = 0;
	let offset = headerSize;
	f(offset, 259);
	f(offset + 4, 259 * 210 / 297);
	f(offset + 8, 269);
	f(offset + 12, 259 * 210 / 297);
	b.set([1, 1, 0, 0, 0, 0], offset + 16);
	offset += 22;
	f(offset, 259);
	f(offset + 4, 259 * 210 / 297);
	f(offset + 8, 10);
	h(offset + 12, 5000);
	i(offset + 14, 0);
	i(offset + 18, 90 * 65536);
	i(offset + 22, 90 * 65536);
	b.set([1, 2, 16, 0, 0, 0], offset + 26);
	offset += 32;
	f(offset, 259);
	f(offset + 4, 259 * 210 / 297);
	f(offset + 8, 269);
	f(offset + 12, 259 * 210 / 297);
	i(offset + 16, 0x40000000);
	b[offset + 20] = 1;
	b[offset + 21] = 0;
	offset += 24;
	b.set(pool, offset);
	offset += pool.length;
	f(offset, 259);
	f(offset + 4, 259 * 210 / 297);
	b[offset + 8] = 0;
	b[offset + 9] = 3;
	offset += 12;
	put(offset, 'test-l');
	put(offset + 2048, 'test-g');
	return buffer;
};
