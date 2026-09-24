import type { GaussianSplatData, GaussianSplatPlyInspection } from '../gaussian-splat';

const MAGIC = 0x5053474e;
const SH_C0 = 0.28209479177387814;
const COLOR_SCALE = 0.15;
const COORDINATE_SYSTEM_EXTENSION = 0xadbe0003;

export class SpzError extends Error {}

interface SpzHeader {
	version: number;
	count: number;
	shDegree: number;
	fractionalBits: number;
	flags: number;
}

const readHeader = (bytes: Uint8Array): SpzHeader => {
	if (bytes.byteLength < 16) throw new SpzError('SPZヘッダーが途中で終わっています。');
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (view.getUint32(0, true) !== MAGIC) throw new SpzError('SPZファイルではありません。');
	const version = view.getUint32(4, true);
	if (version < 1 || version > 4) throw new SpzError(`SPZバージョン ${version} は未対応です。`);
	const count = view.getUint32(8, true);
	const shDegree = bytes[12];
	const fractionalBits = bytes[13];
	if (count === 0 || count > 0x7fffffff || shDegree > 4 || fractionalBits > 24) {
		throw new SpzError('SPZヘッダーの点数・SH次数・座標精度が不正です。');
	}
	return { version, count, shDegree, fractionalBits, flags: bytes[14] };
};

const isGzip = (bytes: Uint8Array) => bytes[0] === 0x1f && bytes[1] === 0x8b;

/** 旧形式はgzipを先頭までだけ展開し、大きなファイルを登録前に二重展開しない。 */
export const inspectSpzFile = async (
	file: File
): Promise<Extract<GaussianSplatPlyInspection, { kind: 'gaussian-splat'; }>> => {
	let bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
	const gzip = isGzip(bytes);
	if (gzip) {
		const reader = file.stream().pipeThrough(new DecompressionStream('gzip')).getReader();
		bytes = new Uint8Array(16);
		let offset = 0;
		try {
			while (offset < bytes.length) {
				const result = await reader.read();
				if (result.done) throw new SpzError('SPZヘッダーが途中で終わっています。');
				const part = result.value.subarray(0, bytes.length - offset);
				bytes.set(part, offset);
				offset += part.length;
			}
		} catch (error) {
			throw error instanceof SpzError
				? error
				: new SpzError('SPZのgzipデータを展開できません。');
		} finally {
			await reader.cancel().catch(() => {});
			reader.releaseLock();
		}
	}
	const header = readHeader(bytes);
	if ((gzip && header.version === 4) || (!gzip && header.version !== 4)) {
		throw new SpzError('SPZのバージョンと圧縮形式が一致しません。');
	}
	return { kind: 'gaussian-splat', splatCount: header.count, shDegree: header.shDegree };
};

const attributeSizes = ({ version, count, shDegree }: SpzHeader) => [
	count * (version === 1 ? 6 : 9),
	count,
	count * 3,
	count * 3,
	count * (version >= 3 ? 4 : 3),
	count * ((shDegree + 1) ** 2 - 1) * 3
];

/** 拡張ILVを検証し、格納座標系を取得する。カメラ制限など未知の拡張は読み飛ばす。 */
const readCoordinateSystem = (bytes: Uint8Array, start: number, end: number) => {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let coordinateSystem = 4; // SPZ既定のRUB（Three.jsと同じY-up）。
	for (let offset = start; offset < end;) {
		if (offset + 8 > end) throw new SpzError('SPZの拡張ヘッダーが途中で終わっています。');
		const type = view.getUint32(offset, true);
		const length = view.getUint32(offset + 4, true);
		offset += 8;
		if (offset + length > end) throw new SpzError('SPZの拡張データが途中で終わっています。');
		if (type === COORDINATE_SYSTEM_EXTENSION) {
			if (length !== 4) throw new SpzError('SPZの座標系拡張が不正です。');
			coordinateSystem = view.getUint32(offset, true);
			if (coordinateSystem < 1 || coordinateSystem > 16) {
				throw new SpzError('SPZの格納座標系が不正です。');
			}
		}
		offset += length;
	}
	return coordinateSystem;
};

interface ZstdDecoder {
	simple: { decompress: (bytes: Uint8Array) => Uint8Array | null; };
	generic: { contentSize: (bytes: Uint8Array) => number | null; };
}
let zstdDecoder: Promise<ZstdDecoder> | undefined;
const getZstdDecoder = () => {
	zstdDecoder ??= import('zstd-codec').then(({ ZstdCodec }) =>
		new Promise<ZstdDecoder>((resolve) => {
			ZstdCodec.run((module) => {
				const codec = module as {
					Simple: new() => ZstdDecoder['simple'];
					Generic: new() => ZstdDecoder['generic'];
				};
				resolve({ simple: new codec.Simple(), generic: new codec.Generic() });
			});
		})
	);
	return zstdDecoder;
};

const unpackV4 = async (bytes: Uint8Array, header: SpzHeader) => {
	if (bytes.length < 32) throw new SpzError('SPZ v4ヘッダーが途中で終わっています。');
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const tocOffset = view.getUint32(16, true);
	const sizes = attributeSizes(header).filter((size) => size > 0);
	if (
		bytes[15] !== sizes.length || tocOffset < 32 || tocOffset + sizes.length * 16 > bytes.length
	) {
		throw new SpzError('SPZの圧縮ストリーム一覧が不正です。');
	}
	const coordinateSystem = header.flags & 2 ? readCoordinateSystem(bytes, 32, tocOffset) : 4;
	let offset = tocOffset + sizes.length * 16;
	const ranges = sizes.map((expectedSize, index) => {
		const compressedSize = Number(view.getBigUint64(tocOffset + index * 16, true));
		const decodedSize = Number(view.getBigUint64(tocOffset + index * 16 + 8, true));
		if (
			!Number.isSafeInteger(compressedSize) || compressedSize <= 0
			|| decodedSize !== expectedSize || offset + compressedSize > bytes.length
		) {
			throw new SpzError('SPZの圧縮ストリームのサイズが不正です。');
		}
		const range = bytes.subarray(offset, offset + compressedSize);
		offset += compressedSize;
		return range;
	});
	if (offset !== bytes.length) {
		throw new SpzError('SPZの圧縮ストリームに余分なデータがあります。');
	}
	const decoder = await getZstdDecoder();
	const streams = ranges.map((range, index) => {
		if (decoder.generic.contentSize(range) !== sizes[index]) {
			throw new SpzError('SPZのZstandard展開サイズが一致しません。');
		}
		const decoded = decoder.simple.decompress(range);
		if (!decoded || decoded.length !== sizes[index]) {
			throw new SpzError('SPZのZstandardデータを展開できません。');
		}
		return decoded;
	});
	return { streams, coordinateSystem };
};

const halfToFloat = (bits: number) => {
	const sign = bits & 0x8000 ? -1 : 1;
	const exponent = (bits >>> 10) & 31;
	const mantissa = bits & 1023;
	return exponent === 0
		? sign * mantissa * 2 ** -24
		: exponent === 31
		? (mantissa ? NaN : sign * Infinity)
		: sign * (1 + mantissa / 1024) * 2 ** (exponent - 15);
};

/** SPZ v1–3 (gzip) / v4 (Zstandard) を既存の簡易3DGS描画データへ正規化する。 */
export const parseSpz = async (buffer: ArrayBuffer): Promise<GaussianSplatData> => {
	let bytes = new Uint8Array(buffer);
	const gzip = isGzip(bytes);
	if (gzip) {
		try {
			bytes = new Uint8Array(
				await new Response(
					new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))
				).arrayBuffer()
			);
		} catch {
			throw new SpzError('SPZのgzipデータを展開できません。');
		}
	}
	const header = readHeader(bytes);
	if ((gzip && header.version === 4) || (!gzip && header.version !== 4)) {
		throw new SpzError('SPZのバージョンと圧縮形式が一致しません。');
	}
	let streams: Uint8Array[];
	let coordinateSystem = 4;
	if (header.version === 4) {
		({ streams, coordinateSystem } = await unpackV4(bytes, header));
	} else {
		let offset = 16;
		streams = attributeSizes(header).map((size) => {
			if (offset + size > bytes.length) {
				throw new SpzError('SPZの点データが途中で終わっています。');
			}
			const part = bytes.subarray(offset, offset + size);
			offset += size;
			return part;
		});
		if (header.flags & 2) coordinateSystem = readCoordinateSystem(bytes, offset, bytes.length);
		else if (offset !== bytes.length) {
			throw new SpzError('SPZの点データに余分なデータがあります。');
		}
	}
	const [packedPositions, alphas, packedColors, packedScales] = streams;
	const positions = new Float32Array(header.count * 3);
	const colors = new Uint8Array(header.count * 3);
	const opacities = new Float32Array(header.count);
	const scales = new Float32Array(header.count);
	const bounds: GaussianSplatData['bounds'] = [
		Infinity,
		Infinity,
		Infinity,
		-Infinity,
		-Infinity,
		-Infinity
	];
	const positionView = new DataView(
		packedPositions.buffer,
		packedPositions.byteOffset,
		packedPositions.byteLength
	);
	const coordinateScale = 2 ** -header.fractionalBits;
	// SPZ公式の座標変換順序: 軸の符号を揃え、別系列の座標系ならX軸まわりに-90°回す。
	const flips = (coordinateSystem - 1) ^ 3;
	for (let i = 0; i < header.count; i++) {
		const start = i * 3;
		for (let axis = 0; axis < 3; axis++) {
			const k = start + axis;
			const offset = k * 3;
			const packed = packedPositions[offset] | (packedPositions[offset + 1] << 8)
				| (packedPositions[offset + 2] << 16);
			const position = header.version === 1
				? halfToFloat(positionView.getUint16(k * 2, true))
				: ((packed << 8) >> 8) * coordinateScale;
			if (!Number.isFinite(position)) {
				throw new SpzError('SPZに有限でない座標が含まれています。');
			}
			positions[k] = position * (flips & (1 << axis) ? -1 : 1);
			const color = 0.5 + SH_C0 * ((packedColors[k] / 255 - 0.5) / COLOR_SCALE);
			colors[k] = Math.round(Math.max(0, Math.min(1, color)) * 255);
		}
		if (coordinateSystem > 8) {
			const y = positions[start + 1];
			positions[start + 1] = positions[start + 2];
			positions[start + 2] = -y;
		}
		for (let axis = 0; axis < 3; axis++) {
			bounds[axis] = Math.min(bounds[axis], positions[start + axis]);
			bounds[axis + 3] = Math.max(bounds[axis + 3], positions[start + axis]);
		}
		opacities[i] = alphas[i] / 255;
		scales[i] = Math.exp(
			Math.max(packedScales[start], packedScales[start + 1], packedScales[start + 2]) / 16
				- 10
		);
	}
	return { positions, colors, opacities, scales, bounds };
};
