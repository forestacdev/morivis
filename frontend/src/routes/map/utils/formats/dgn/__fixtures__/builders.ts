// 架空のISFFレコードを手作りする。製品パーサーの変換関数は使わない。
export const int32 = (bytes: Uint8Array, offset: number, value: number) => {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	view.setUint16(offset, value >>> 16, true);
	view.setUint16(offset + 2, value & 65535, true);
};
export const word = (bytes: Uint8Array, offset: number, value: number) => {
	new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(offset, value, true);
};
export const vax = (bytes: Uint8Array, offset: number, value: number) => {
	if (!value) {
		bytes.fill(0, offset, offset + 8);
		return;
	}
	const exponent = Math.floor(Math.log2(Math.abs(value)));
	let fraction = Math.abs(value) / 2 ** exponent - 1;
	const upper = Math.floor(fraction * 128);
	word(bytes, offset, (value < 0 ? 0x8000 : 0) | ((exponent + 129) << 7) | upper);
	fraction = fraction * 128 - upper;
	for (let i = 2; i < 8; i += 2) {
		fraction *= 65536;
		word(bytes, offset + i, Math.floor(fraction));
		fraction -= Math.floor(fraction);
	}
};
export const element = (type: number, size: number, level = 1) => {
	const bytes = new Uint8Array(size);
	bytes[0] = level;
	bytes[1] = type;
	word(bytes, 2, (size - 4) / 2);
	if (size >= 36) {
		word(bytes, 30, (size - 32) / 2);
		bytes[35] = 3;
	}
	return bytes;
};
export const drawing = (elements: Uint8Array[], dimension: 2 | 3 = 2, origin = [0, 0, 0]) => {
	const header = element(9, 1536, dimension === 2 ? 8 : 0xc8);
	int32(header, 1112, 10);
	int32(header, 1116, 100);
	header.set([109, 0, 99, 109], 1120);
	header[1214] = dimension === 3 ? 0x40 : 0;
	origin.forEach((v, i) => vax(header, 1240 + i * 8, v * 1000));
	const bytes = new Uint8Array(1538 + elements.reduce((sum, e) => sum + e.length, 0));
	bytes.set(header);
	let offset = 1536;
	for (const e of elements) {
		bytes.set(e, offset);
		offset += e.length;
	}
	bytes.set([255, 255], offset);
	return bytes;
};
export const multipoint = (points: number[][], type = 4, dimension: 2 | 3 = 2) => {
	const bytes = element(type, 38 + points.length * dimension * 4);
	word(bytes, 36, points.length);
	points.forEach((p, i) => {
		for (let axis = 0; axis < dimension; axis++) {
			int32(bytes, 38 + (i * dimension + axis) * 4, (p[axis] ?? 0) * 1000);
		}
	});
	return bytes;
};
export const arc = (sweep = 90, dimension: 2 | 3 = 2, quaternion = [1, 0, 0, 0]) => {
	const bytes = element(16, dimension === 2 ? 80 : 100);
	int32(bytes, 36, 0);
	int32(bytes, 40, Math.round(Math.abs(sweep) * 360000) | (sweep < 0 ? 0x80000000 : 0));
	vax(bytes, 44, 5000);
	vax(bytes, 52, 2000);
	if (dimension === 3) {
		quaternion.forEach((v, i) => int32(bytes, 60 + i * 4, Math.round(v * 2147483647)));
	}
	const center = dimension === 2 ? 64 : 76;
	vax(bytes, center, 10000);
	vax(bytes, center + 8, 20000);
	return bytes;
};
export const ellipse = () => {
	const bytes = element(15, 72);
	vax(bytes, 36, 5000);
	vax(bytes, 44, 2000);
	int32(bytes, 52, 90 * 360000);
	vax(bytes, 56, 10000);
	vax(bytes, 64, 20000);
	return bytes;
};
export const complex = (children: Uint8Array[], shape = false) => {
	const header = element(shape ? 14 : 12, 40);
	const length = 40 + children.reduce((sum, e) => sum + e.length, 0);
	word(header, 36, (length - 38) / 2);
	word(header, 38, children.length);
	const output = new Uint8Array(length);
	output.set(header);
	let offset = 40;
	for (const child of children) {
		output.set(child, offset);
		output[offset] |= 0x80;
		offset += child.length;
	}
	return output;
};
export const withAttributes = (geometry: Uint8Array, attributes: Uint8Array) => {
	const bytes = new Uint8Array(geometry.length + attributes.length);
	bytes.set(geometry);
	bytes.set(attributes, geometry.length);
	word(bytes, 2, (bytes.length - 4) / 2);
	word(bytes, 30, (geometry.length - 32) / 2);
	word(bytes, 32, 0x0800);
	return bytes;
};
export const deltaLine = () => {
	const attrs = new Uint8Array(24);
	attrs.set([11, 0x10, 0x95, 0x19, 0xa9, 0x51, 7, 0], 0);
	word(attrs, 10, 16384);
	word(attrs, 12, -8192);
	word(attrs, 14, -16384);
	word(attrs, 16, 8192);
	return withAttributes(multipoint([[1, 2], [3, 4]]), attrs);
};
export const testCurves = () =>
	drawing(
		[
			arc(),
			arc(-90),
			ellipse(),
			multipoint([[-2, 0], [-1, 0], [0, 0], [2, 2], [4, 0], [5, 0], [6, 0]], 11),
			deltaLine(),
			complex([multipoint([[0, 0], [1, 1]]), multipoint([[1, 1], [2, 0]])]),
			complex([
				multipoint([[0, 0], [10, 0]]),
				multipoint([[10, 0], [10, 10]]),
				multipoint([[10, 10], [0, 10]]),
				multipoint([[0, 10], [0, 0]])
			], true)
		],
		2,
		[1, -2, 0]
	);
