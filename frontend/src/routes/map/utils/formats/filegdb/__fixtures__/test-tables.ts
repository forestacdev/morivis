// 架空の1点とシステムカタログを持つ最小FileGDB。外部データは使わない。
const uint = (value: number, bytes: number) => {
	const output = new Uint8Array(bytes);
	new DataView(output.buffer).setUint32(0, value, true);
	return [...output];
};
const double = (value: number) => {
	const output = new Uint8Array(8);
	new DataView(output.buffer).setFloat64(0, value, true);
	return [...output];
};
const varuint = (value: number) => {
	const output: number[] = [];
	do {
		const next = value & 127;
		value >>>= 7;
		output.push(next | (value ? 128 : 0));
	} while (value);
	return output;
};
const text = (value: string) => [...new TextEncoder().encode(value)];
const field = (name: string, type: number) => [
	name.length,
	...[...name].flatMap(char => [char.charCodeAt(0), 0]),
	0,
	type
];
const stringField = [...field('Name', 4), ...uint(255, 4), 0, 0];
const projection = text('EPSG:3857');
const geometryField = [
	...field('Shape', 7),
	0,
	0,
	projection.length,
	0,
	...projection,
	1,
	...double(0),
	...double(0),
	...double(1),
	...double(0.001),
	0,
	1,
	0,
	0,
	0,
	...double(0)
];
const table = (rows: number[][], geometry = false) => {
	const schema = [...new Uint8Array(14), ...stringField, ...(geometry ? geometryField : [])];
	schema[12] = geometry ? 2 : 1;
	const data = [...new Uint8Array(160), ...schema];
	const offsets = rows.map(row => {
		const offset = data.length;
		data.push(...uint(row.length, 4), ...row);
		return offset;
	});
	const buffer = new Uint8Array(data);
	const view = new DataView(buffer.buffer);
	view.setUint32(4, rows.length, true);
	view.setUint32(24, buffer.length, true);
	view.setUint32(32, 160, true);
	view.setUint32(160, schema.length, true);
	const index = new Uint8Array([
		...new Uint8Array(16),
		...offsets.flatMap(offset => [...uint(offset, 4), 0])
	]);
	new DataView(index.buffer).setUint32(8, rows.length, true);
	return [buffer, index];
};
export const createTestFileGdb = () => {
	const catalog = table(['GDB_System', 'test-points'].map(name => [name.length, ...text(name)]));
	const point = [1, ...varuint(1250), ...varuint(2500)];
	const points = table([[0, 10, ...text('test-point'), point.length, ...point]], true);
	return new Map([
		['a00000001.gdbtable', catalog[0]],
		['a00000001.gdbtablx', catalog[1]],
		['a00000009.gdbtable', points[0]],
		['a00000009.gdbtablx', points[1]]
	]);
};
