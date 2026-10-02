import { zlibSync } from 'three/addons/libs/fflate.module.js';

const text = (value: string) => new TextEncoder().encode(value);
export const joinBytes = (...arrays: Uint8Array[]): Uint8Array<ArrayBuffer> => {
	const result = new Uint8Array(arrays.reduce((sum, array) => sum + array.length, 0));
	let offset = 0;
	for (const array of arrays) {
		result.set(array, offset);
		offset += array.length;
	}
	return result;
};
const numericBytes = (values: number[], type: 'Float64' | 'Int32' | 'UInt64', little = true) => {
	const bytes = new Uint8Array(values.length * (type === 'Int32' ? 4 : 8));
	const view = new DataView(bytes.buffer);
	values.forEach((value, i) => {
		if (type === 'Float64') view.setFloat64(i * 8, value, little);
		else if (type === 'Int32') view.setInt32(i * 4, value, little);
		else view.setBigUint64(i * 8, BigInt(value), little);
	});
	return bytes;
};

export const legacyBinary = () =>
	joinBytes(
		text(
			'# vtk DataFile Version 3.0\ntest-binary\nBINARY\nDATASET POLYDATA\nPOINTS 3 double\n'
		),
		numericBytes([0, 0, 0, 2, 0, 0, 0, 2, 0], 'Float64', false),
		text('\nPOLYGONS 1 4\n'),
		numericBytes([3, 0, 1, 2], 'Int32', false),
		text('\nPOINT_DATA 3\nSCALARS test-value double\nLOOKUP_TABLE default\n'),
		numericBytes([4, 5, 6], 'Float64', false),
		text('\n')
	).buffer;

export interface XmlFixtureOptions {
	format?: 'ascii' | 'binary' | 'appended';
	compressed?: boolean;
	raw?: boolean;
	little?: boolean;
	header64?: boolean;
	segmented?: boolean;
	oversized?: boolean;
}

export const xmlSurface = (options: XmlFixtureOptions = {}) => {
	const {
		format = 'ascii',
		compressed = false,
		raw = false,
		little = true,
		header64 = false,
		segmented = false
	} = options;
	const appended: Uint8Array[] = [];
	let offset = 0;
	const header = (values: number[]) =>
		numericBytes(values, header64 ? 'UInt64' : 'Int32', little);
	const base64 = (value: Uint8Array) => text(Buffer.from(value).toString('base64'));
	const array = (name: string, values: number[], type: 'Float64' | 'Int32', components = 1) => {
		const attrs =
			`type="${type}" Name="${name}" NumberOfComponents="${components}" format="${format}"`;
		if (format === 'ascii') return `<DataArray ${attrs}>${values.join(' ')}</DataArray>`;
		const bytes = numericBytes(values, type, little);
		// Two independent zlib blocks exercise the block table and last-block sizing.
		const size = Math.min(16, bytes.length);
		const chunks = [];
		for (let i = 0; i < bytes.length; i += size) {
			chunks.push(zlibSync(bytes.subarray(i, i + size)));
		}
		const prefix = compressed
			? header([
				chunks.length,
				options.oversized ? 200_000_000 : size,
				bytes.length % size,
				...chunks.map(chunk => chunk.length)
			])
			: header([bytes.length]);
		const payload = compressed ? joinBytes(...chunks) : bytes;
		const encoded = raw && format === 'appended'
			? joinBytes(prefix, payload)
			: segmented
			? joinBytes(base64(prefix), base64(payload))
			: base64(joinBytes(prefix, payload));
		if (format === 'binary') {
			return `<DataArray ${attrs}>${new TextDecoder().decode(encoded)}</DataArray>`;
		}
		const result = `<DataArray ${attrs} offset="${offset}"/>`;
		appended.push(encoded);
		offset += encoded.length;
		return result;
	};
	const xml = `<VTKFile type="PolyData" byte_order="${
		little ? 'LittleEndian' : 'BigEndian'
	}" header_type="${header64 ? 'UInt64' : 'UInt32'}"${
		compressed ? ' compressor="vtkZLibDataCompressor"' : ''
	}>
<PolyData><Piece NumberOfPoints="4" NumberOfPolys="1" NumberOfStrips="0" NumberOfVerts="0" NumberOfLines="0">
<Points>${array('test-points', [0, 0, 0, 2, 0, 0, 2, 2, 0, 0, 2, 0], 'Float64', 3)}</Points>
<Polys>${array('connectivity', [0, 1, 2, 3], 'Int32')}${array('offsets', [4], 'Int32')}</Polys>
<PointData>${array('test-value', [1, 2, 3, 4], 'Float64')}</PointData>
</Piece></PolyData>`;
	return format === 'appended'
		? joinBytes(
			text(xml + `<AppendedData encoding="${raw ? 'raw' : 'base64'}">_`),
			...appended,
			text('</AppendedData></VTKFile>')
		).buffer
		: text(xml + '</VTKFile>').buffer;
};
