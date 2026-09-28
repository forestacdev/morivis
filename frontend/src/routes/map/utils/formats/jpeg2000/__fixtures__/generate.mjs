// 任意の座標・画素値だけからJP2を生成する。リポジトリのルートで実行。
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { writeArrayBuffer } from 'geotiff';
const require = createRequire(import.meta.url);
const init = require('@cornerstonejs/codec-openjpeg/wasmjs');
const codec = await init({
	wasmBinary: fs.readFileSync(require.resolve('@cornerstonejs/codec-openjpeg/wasm'))
});
const box = (type, ...contents) => {
	const payload = Buffer.concat(contents.map((item) => Buffer.from(item)));
	const head = Buffer.alloc(8);
	head.writeUInt32BE(8 + payload.length);
	head.write(type, 4);
	return Buffer.concat([head, payload]);
};
const width = 4,
	height = 4;
const encode = (bits, components, signed = false) => {
	const encoder = new codec.J2KEncoder();
	try {
		const buffer = encoder.getDecodedBuffer({
			width,
			height,
			bitsPerSample: bits,
			componentCount: components,
			isSigned: signed
		});
		const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
		const samples = [];
		for (let i = 0; i < width * height * components; i++) {
			const value =
				components === 4 && i % 4 === 3
					? i === 3
						? 0
						: 255
					: signed
						? i * 100 - 800
						: bits === 16
							? i * 1000
							: (i * 17) % 256;
			samples.push(value);
			if (bits === 8) view.setUint8(i, value);
			else if (signed) view.setInt16(i * 2, value, true);
			else view.setUint16(i * 2, value, true);
		}
		encoder.setDecompositions(1);
		encoder.setQuality(true, 1);
		encoder.encode();
		return { stream: Buffer.from(encoder.getEncodedBuffer()), samples };
	} finally {
		encoder.delete();
	}
};
const rgb = encode(8, 3),
	gray = encode(16, 1),
	signed = encode(16, 1, true);
const rgba = encode(8, 4);
const geo = (extra) =>
	Buffer.from(
		writeArrayBuffer([0], {
			width: 1,
			height: 1,
			ModelPixelScale: [0.01, 0.01, 0],
			ModelTiepoint: [0, 0, 0, 2, 1, 0],
			GTModelTypeGeoKey: 2,
			GTRasterTypeGeoKey: 1,
			GeographicTypeGeoKey: 4326,
			...extra
		})
	);
for (const [name, encoded, bits, components, isSigned, metadata] of [
	['test-color', rgb, 8, 3, false, null],
	['test-alpha', rgba, 8, 4, false, null],
	['test-geojp2', rgb, 8, 3, false, geo({})],
	[
		'test-projected',
		rgb,
		8,
		3,
		false,
		geo({
			GTModelTypeGeoKey: 1,
			ProjectedCSTypeGeoKey: 3857,
			ModelPixelScale: [10, 10, 0],
			ModelTiepoint: [0, 0, 0, 1000, 2000, 0]
		})
	],
	['test-height', gray, 16, 1, false, geo({})],
	['test-signed', signed, 16, 1, true, geo({})],
	['test-unknown', rgb, 8, 3, false, geo({ GTModelTypeGeoKey: 32767, GeographicTypeGeoKey: 32767 })]
]) {
	const ihdr = Buffer.alloc(14);
	ihdr.writeUInt32BE(height);
	ihdr.writeUInt32BE(width, 4);
	ihdr.writeUInt16BE(components, 8);
	ihdr[10] = bits - 1 + (isSigned ? 128 : 0);
	ihdr[11] = 7;
	const colr = Buffer.alloc(7);
	colr[0] = 1;
	colr.writeUInt32BE(components === 1 ? 17 : 16, 3);
	const cdef = Buffer.alloc(26);
	cdef.writeUInt16BE(4);
	for (let c = 0; c < 4; c++) {
		cdef.writeUInt16BE(c, 2 + c * 6);
		cdef.writeUInt16BE(c === 3 ? 1 : 0, 4 + c * 6);
		cdef.writeUInt16BE(c === 3 ? 0 : c + 1, 6 + c * 6);
	}
	const jp2 = Buffer.concat([
		box('jP  ', Buffer.from([13, 10, 135, 10])),
		box('ftyp', Buffer.from('jp2 '), Buffer.alloc(4), Buffer.from('jp2 ')),
		box(
			'jp2h',
			box('ihdr', ihdr),
			box('colr', colr),
			...(components === 4 ? [box('cdef', cdef)] : [])
		),
		...(metadata
			? [box('uuid', Buffer.from('b14bf8bd083d4b43a5ae8cd7d5a6ce03', 'hex'), metadata)]
			: []),
		box('jp2c', encoded.stream)
	]);
	fs.writeFileSync(new URL(`./${name}.jp2`, import.meta.url), jp2);
}
fs.writeFileSync(
	new URL('./test-values.json', import.meta.url),
	JSON.stringify({ rgb: rgb.samples, gray: gray.samples, signed: signed.samples }, null, 2) + '\n'
);
fs.writeFileSync(new URL('./test-color.j2w', import.meta.url), '0.01\n0\n0\n-0.01\n2.005\n0.995\n');
fs.writeFileSync(new URL('./test-color.prj', import.meta.url), 'EPSG:4326\n');
console.log('Generated synthetic JPEG2000 fixtures');
