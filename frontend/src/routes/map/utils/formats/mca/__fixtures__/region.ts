// 実ワールドを含まない、手作りの最小NBT/MCA生成器。
import { deflateSync, gzipSync } from 'node:zlib';

export interface TestTag {
	type: number;
	value: unknown;
}
export const tag = (type: number, value: unknown): TestTag => ({ type, value });
const int = (value: number, length = 4): Buffer => {
	const result = Buffer.alloc(length);
	result.writeIntBE(value, 0, length);
	return result;
};
const str = (value: string) => {
	const bytes = Buffer.from(value);
	return Buffer.concat([int(bytes.length, 2), bytes]);
};
const payload = ({ type, value }: TestTag): Buffer => {
	if (type === 1) return int(value as number, 1);
	if (type === 3) return int(value as number);
	if (type === 8) return str(value as string);
	if (type === 9) {
		const list = value as { type: number; values: unknown[]; };
		return Buffer.concat([
			Buffer.from([list.type]),
			int(list.values.length),
			...list.values.map((item) => payload(tag(list.type, item)))
		]);
	}
	if (type === 10) {
		return Buffer.concat([
			...Object.entries(value as Record<string, TestTag>).map(([key, child]) =>
				Buffer.concat([Buffer.from([child.type]), str(key), payload(child)])
			),
			Buffer.from([0])
		]);
	}
	if (type === 12) {
		const longs = value as bigint[];
		const bytes = Buffer.alloc(longs.length * 8);
		longs.forEach((n, i) => bytes.writeBigUInt64BE(n, i * 8));
		return Buffer.concat([int(longs.length), bytes]);
	}
	throw new Error(`Unsupported test tag ${type}`);
};
export const nbtFixture = (value: Record<string, TestTag>): Uint8Array =>
	Buffer.concat([Buffer.from([10, 0, 0]), payload(tag(10, value))]);

export const packedStates = (values: number[], paletteSize: number, padded = true): bigint[] => {
	const bits = Math.max(4, Math.ceil(Math.log2(paletteSize)));
	const perLong = Math.floor(64 / bits);
	const longs = Array<bigint>(
		padded ? Math.ceil(values.length / perLong) : Math.ceil(values.length * bits / 64)
	).fill(0n);
	values.forEach((value, i) => {
		const offset = padded ? (i % perLong) * bits : i * bits % 64;
		const index = padded ? Math.floor(i / perLong) : Math.floor(i * bits / 64);
		const encoded = BigInt(value) << BigInt(offset);
		longs[index] |= BigInt.asUintN(64, encoded);
		if (offset + bits > 64) longs[index + 1] |= encoded >> 64n;
	});
	return longs;
};

interface TestChunkOptions {
	x?: number;
	z?: number;
	y?: number;
	version?: number;
	modern?: boolean;
	padded?: boolean;
	palette?: string[];
	values?: number[];
}

export const chunkFixture = (options: TestChunkOptions = {}): Uint8Array => {
	const {
		x = 0,
		z = 0,
		y = 0,
		version = 2865,
		modern = true,
		padded = true,
		palette = ['minecraft:air', 'minecraft:stone'],
		values = [1, ...Array<number>(4095).fill(0)]
	} = options;
	const names = tag(9, { type: 10, values: palette.map((name) => ({ Name: tag(8, name) })) });
	const states = palette.length > 1
		? tag(12, packedStates(values, palette.length, padded))
		: undefined;
	const section = {
		Y: tag(1, y),
		...(modern
			? { block_states: tag(10, { palette: names, ...(states && { data: states }) }) }
			: { Palette: names, ...(states && { BlockStates: states }) })
	};
	const level = {
		xPos: tag(3, x),
		zPos: tag(3, z),
		[modern ? 'sections' : 'Sections']: tag(9, { type: 10, values: [section] })
	};
	return nbtFixture({
		DataVersion: tag(3, version),
		...(modern ? level : { Level: tag(10, level) })
	});
};

export const regionFixture = (
	chunks: { nbt: Uint8Array; index?: number; compression?: number; }[] = [{ nbt: chunkFixture() }]
): ArrayBuffer => {
	const header = Buffer.alloc(8192);
	let sector = 2;
	const data = chunks.map(({ nbt, index = 0, compression = 2 }) => {
		const compressed = compression === 2
			? deflateSync(nbt)
			: compression === 1
			? gzipSync(nbt)
			: Buffer.from(nbt);
		const sectors = Math.ceil((compressed.length + 5) / 4096);
		header.writeUInt32BE(sector * 256 + sectors, index * 4);
		sector += sectors;
		const bytes = Buffer.alloc(sectors * 4096);
		bytes.writeUInt32BE(compressed.length + 1, 0);
		bytes.writeUInt8(compression, 4);
		compressed.copy(bytes, 5);
		return bytes;
	});
	const bytes = Buffer.concat([header, ...data]);
	return Uint8Array.from(bytes).buffer;
};
