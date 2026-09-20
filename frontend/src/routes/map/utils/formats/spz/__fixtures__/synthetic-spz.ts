import { gzipSync } from 'node:zlib';
import { ZstdCodec } from 'zstd-codec';

export const createSyntheticSpz = async (version = 2, shDegree = 0, coordinateSystem?: number) => {
	const positions = new Uint8Array(version === 1 ? 12 : 18);
	const values = version === 1 ? [1, -2, 3, 4, 5, -6] : [1.25, -2.5, 3, 4, 5, -6.75];
	const halves = [0x3c00, 0xc000, 0x4200, 0x4400, 0x4500, 0xc600];
	values.forEach((value, i) => {
		if (version === 1) new DataView(positions.buffer).setUint16(i * 2, halves[i], true);
		else {
			const fixed = Math.round(value * 4096);
			positions.set([fixed & 255, (fixed >> 8) & 255, (fixed >> 16) & 255], i * 3);
		}
	});
	const rotations = version < 3
		? new Uint8Array(6).fill(128)
		: new Uint8Array([0, 0, 0, 192, 0, 0, 0, 192]);
	const streams = [
		positions,
		new Uint8Array([64, 255]),
		new Uint8Array([128, 160, 96, 255, 0, 128]),
		new Uint8Array([160, 144, 128, 128, 176, 160]),
		rotations,
		new Uint8Array(2 * ((shDegree + 1) ** 2 - 1) * 3).fill(128)
	];
	const extension = new Uint8Array(coordinateSystem === undefined ? 0 : 12);
	if (coordinateSystem !== undefined) {
		const view = new DataView(extension.buffer);
		view.setUint32(0, 0xadbe0003, true);
		view.setUint32(4, 4, true);
		view.setUint32(8, coordinateSystem, true);
	}
	const header = new Uint8Array(version === 4 ? 32 : 16);
	const view = new DataView(header.buffer);
	view.setUint32(0, 0x5053474e, true);
	view.setUint32(4, version, true);
	view.setUint32(8, 2, true);
	header[12] = shDegree;
	header[13] = 12;
	header[14] = extension.length ? 2 : 0;
	const combine = (parts: Uint8Array[]) => {
		const result = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
		let offset = 0;
		for (const p of parts) {
			result.set(p, offset);
			offset += p.length;
		}
		return result;
	};
	if (version !== 4) {
		return new Uint8Array(gzipSync(combine([header, ...streams, extension]))).buffer;
	}
	const codec = await new Promise<{ compress: (bytes: Uint8Array) => Uint8Array; }>((resolve) => {
		ZstdCodec.run((module) => {
			const c = module as {
				Simple: new() => { compress: (bytes: Uint8Array) => Uint8Array; };
			};
			resolve(new c.Simple());
		});
	});
	const nonempty = streams.filter(s => s.length);
	header[15] = nonempty.length;
	view.setUint32(16, 32 + extension.length, true);
	const compressed = nonempty.map(s => codec.compress(s));
	const toc = new Uint8Array(nonempty.length * 16);
	const tocView = new DataView(toc.buffer);
	compressed.forEach((s, i) => {
		tocView.setBigUint64(i * 16, BigInt(s.length), true);
		tocView.setBigUint64(i * 16 + 8, BigInt(nonempty[i].length), true);
	});
	return combine([header, extension, toc, ...compressed]).buffer;
};
