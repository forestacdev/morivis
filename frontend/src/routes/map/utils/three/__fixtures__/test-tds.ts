const uint16 = (value: number) => {
	const bytes = new Uint8Array(2);
	new DataView(bytes.buffer).setUint16(0, value, true);
	return [...bytes];
};
const uint32 = (value: number) => {
	const bytes = new Uint8Array(4);
	new DataView(bytes.buffer).setUint32(0, value, true);
	return [...bytes];
};
const floats = (...values: number[]) =>
	values.flatMap((value) => {
		const bytes = new Uint8Array(4);
		new DataView(bytes.buffer).setFloat32(0, value, true);
		return [...bytes];
	});
const string = (value: string) => [...new TextEncoder().encode(value), 0];
export const tdsChunk = (id: number, ...parts: number[][]): number[] => {
	const body = parts.flat();
	return [...uint16(id), ...uint32(body.length + 6), ...body];
};
const track = (id: number, values: number[], spline = false) =>
	tdsChunk(
		id,
		uint16(0),
		uint32(0),
		uint32(0),
		uint32(1),
		uint32(0),
		uint16(spline ? 0x1f : 0),
		spline ? floats(0, 0, 0, 0, 0) : [],
		floats(...values)
	);
const node = (id: number, parent: number, name: string, ...parts: number[][]) =>
	tdsChunk(
		0xb002,
		tdsChunk(0xb030, uint16(id)),
		tdsChunk(0xb010, string(name), uint16(0), uint16(0), uint16(parent)),
		...parts
	);

/** 任意の三角形を、回転・非一様縮尺・pivotを持つ親と独立した親へ配置する。 */
export const createTestTds = (options: { keyframes?: boolean; cycle?: boolean; } = {}) => {
	const mesh = tdsChunk(
		0x4000,
		string('test-mesh'),
		tdsChunk(
			0x4100,
			tdsChunk(0x4110, uint16(3), floats(10, 0, 0, 12, 0, 0, 10, 4, 0)),
			tdsChunk(0x4120, uint16(1), uint16(0), uint16(1), uint16(2), uint16(0)),
			tdsChunk(0x4160, floats(1, 0, 0, 0, 1, 0, 0, 0, 1, 10, 0, 0))
		)
	);
	const hierarchy = tdsChunk(
		0xb000,
		node(
			12,
			42,
			'test-mesh',
			tdsChunk(0xb011, string('test-first')),
			tdsChunk(0xb013, floats(1, 0, 0)),
			track(0xb020, [1, 0, 0], true)
		),
		node(
			42,
			options.cycle ? 12 : -1,
			'$$$DUMMY',
			track(0xb020, [20, 10, 5]),
			track(0xb021, [Math.PI / 2, 0, 0, 1]),
			track(0xb022, [2, 3, 4])
		),
		node(
			7,
			-1,
			'test-mesh',
			tdsChunk(0xb011, string('test-second')),
			track(0xb020, [-10, 0, 0])
		),
		node(80, 12, '$$$DUMMY', tdsChunk(0xb011, string('test-child')), track(0xb020, [0, 0, 3]))
	);
	return new Uint8Array(
		tdsChunk(
			0x4d4d,
			tdsChunk(0x3d3d, mesh),
			...(options.keyframes === false ? [] : [hierarchy])
		)
	).buffer;
};
