export const uint = (value: number): number[] => {
	const bytes: number[] = [];
	do {
		const part = value % 128;
		value = Math.floor(value / 128);
		bytes.push(part + (value ? 128 : 0));
	} while (value);
	return bytes;
};
const signed = (value: number) => uint(value < 0 ? -value * 2 - 1 : value * 2);
const string = (
	value: string
) => [...uint(value.length), ...value.split('').flatMap(char => uint(char.charCodeAt(0)))];
const double = (value: number) => {
	const bytes = new Uint8Array(8);
	new DataView(bytes.buffer).setFloat64(0, value, true);
	return [...bytes];
};
export const record = (...parts: number[][]) => {
	const bytes = parts.flat();
	return [...uint(bytes.length), ...bytes];
};

export const createTestGcd = (options: {
	multipart?: boolean;
	geometryType?: number;
	coordinateMode?: number;
	flags?: number;
	fieldType?: number;
	badBounds?: boolean;
	badPart?: boolean;
	crs?: string;
	fieldName?: string;
	scale?: number;
} = {}) => {
	const points = [[-2, -1], [4, 2], ...(options.multipart ? [[0, 0], [2, 4]] : [])];
	const scale = options.scale ?? 100;
	const header = record(
		[1],
		string(options.crs ?? 'EPSG:3857'),
		[
			-2,
			-1,
			0,
			options.badBounds ? 8 : 4,
			options.multipart ? 4 : 2,
			0,
			0,
			0,
			1,
			1,
			scale,
			scale
		].flatMap(double)
	);
	const schema = record(
		[3, 2],
		record([options.fieldType ?? 3], string(options.fieldName ?? 'test-name'), [0]),
		record([9], string('test-document'), [0])
	);
	let x = 0, y = 0;
	const coordinates = points.flatMap(point => {
		const nextX = point[0] * (scale || 100), nextY = point[1] * (scale || 100);
		const data = [...signed(nextX - x), ...signed(nextY - y)];
		x = nextX;
		y = nextY;
		return data;
	});
	const geometry = record(
		[options.geometryType ?? (options.multipart ? 12 : 4)],
		uint(points.length),
		[options.coordinateMode ?? 0x45],
		coordinates,
		points.map(() => 128),
		options.multipart ? [2, 0, 2, options.badPart ? 1 : 2, 2] : [0, options.badPart ? 1 : 2]
	);
	const attributes = record(
		[2, 0xc0],
		string('test-日本語🌲'),
		string('test-folder/test-document.pdf')
	);
	const object = record(
		[0, options.flags ?? 0],
		options.flags === 2 ? [0, 0, 0, 0] : [],
		[0],
		attributes,
		geometry
	);
	return new Uint8Array([
		0x38,
		0x14,
		...header,
		...schema,
		...record([6, 1], record([1])),
		...record([7, 1], object)
	]).buffer;
};
