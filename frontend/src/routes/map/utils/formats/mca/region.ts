import { resolveMcaMaxFaces } from './limits';
import { asCompound, MAX_NBT_BYTES, type NbtLongArray, type NbtValue, readNbt } from './nbt';
import { type McaOptions, type McaProgress, type McaRegion, sectionKey } from './types';
import { isMcaRegionPositionValid } from './world-placement';

const SECTOR_BYTES = 4096;
const MAX_SECTION_COUNT = 32_768;
export const MAX_REGION_BYTES = 256 * 1024 * 1024;

export const validateMcaOptions = (options: McaOptions) => {
	resolveMcaMaxFaces(options.maxFaces);
	if (options.region && !isMcaRegionPositionValid(options.region)) {
		throw new Error('リージョン座標が不正です');
	}
	const range = {
		minChunkX: options.minChunkX ?? 0,
		maxChunkX: options.maxChunkX ?? 31,
		minChunkZ: options.minChunkZ ?? 0,
		maxChunkZ: options.maxChunkZ ?? 31
	};
	if (
		Object.values(range).some((n) => !Number.isInteger(n) || n < 0 || n > 31)
		|| range.minChunkX > range.maxChunkX || range.minChunkZ > range.maxChunkZ
	) throw new Error('チャンク範囲は0〜31の整数で、開始が終了以下になるよう指定してください');
	return range;
};

const decompressChunk = async (bytes: Uint8Array<ArrayBuffer>, compression: number) => {
	if (compression & 128) {
		throw new Error('外部チャンク（.mcc）を参照するMCAには対応していません');
	}
	if (compression === 3) return bytes;
	if (compression === 4) {
		throw new Error(
			'LZ4圧縮のMCAには対応していません。Minecraftで標準のzlib圧縮で保存してください'
		);
	}
	if (compression !== 1 && compression !== 2) {
		throw new Error(`未対応のチャンク圧縮方式です（${compression}）`);
	}
	const reader = new Blob([bytes]).stream()
		.pipeThrough(new DecompressionStream(compression === 1 ? 'gzip' : 'deflate')).getReader();
	const parts: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			size += value.length;
			if (size > MAX_NBT_BYTES) {
				await reader.cancel();
				throw new Error('チャンクの展開サイズが上限を超えています');
			}
			parts.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const output = new Uint8Array(size);
	let offset = 0;
	for (const part of parts) {
		output.set(part, offset);
		offset += part.length;
	}
	return output;
};

/** 1.13〜1.15の連続ビット列と、1.16以降のlong境界パディングを長さで判別する。 */
export const decodeBlockStates = (
	value: NbtValue | undefined,
	palette: number[]
): number | Uint16Array => {
	if (!palette.length || palette.length > 4096) {
		throw new Error('ブロックパレットの長さが不正です');
	}
	if (value === undefined && palette.length === 1) return palette[0];
	if (!value || typeof value !== 'object' || !('kind' in value) || value.kind !== 'long-array') {
		throw new Error('ブロックの状態データがありません');
	}
	const data = value as NbtLongArray;
	const bits = Math.max(4, Math.ceil(Math.log2(palette.length)));
	const perLong = Math.floor(64 / bits);
	const padded = data.length === Math.ceil(4096 / perLong);
	if (!padded && data.length !== Math.ceil(4096 * bits / 64)) {
		throw new Error('ブロックの状態データの長さが不正です');
	}
	const blocks = new Uint16Array(4096);
	const mask = (1 << bits) - 1;
	for (let i = 0; i < 4096; i++) {
		const word = padded ? Math.floor(i / perLong) : Math.floor(i * bits / 64);
		const shift = padded ? (i % perLong) * bits : i * bits % 64;
		const high = data.view.getUint32(word * 8);
		const low = data.view.getUint32(word * 8 + 4);
		let index: number;
		if (shift < 32) {
			index = low >>> shift;
			if (shift + bits > 32) index |= high << (32 - shift);
		} else {
			index = high >>> (shift - 32);
			if (shift + bits > 64) index |= data.view.getUint32((word + 1) * 8 + 4) << (64 - shift);
		}
		index &= mask;
		if (index >= palette.length) throw new Error('パレットに存在しないブロックIDです');
		blocks[i] = palette[index];
	}
	return blocks.every((id) => id === blocks[0]) ? blocks[0] : blocks;
};

export const readMcaRegion = async (
	buffer: ArrayBuffer,
	options: McaOptions = {},
	onProgress?: (progress: McaProgress) => void
): Promise<McaRegion> => {
	const range = validateMcaOptions(options);
	if (buffer.byteLength < 8192 || buffer.byteLength % SECTOR_BYTES !== 0) {
		throw new Error('MCAのヘッダーまたはファイルサイズが不正です');
	}
	if (buffer.byteLength > MAX_REGION_BYTES) {
		throw new Error('MCAファイルは256 MiB以下にしてください');
	}
	const view = new DataView(buffer);
	const chunks: { index: number; start: number; sectors: number; }[] = [];
	const usedSectors = new Set<number>();
	for (let index = 0; index < 1024; index++) {
		const location = view.getUint32(index * 4);
		if (!location) continue;
		const start = location >>> 8;
		const sectors = location & 255;
		if (start < 2 || !sectors || (start + sectors) * SECTOR_BYTES > buffer.byteLength) {
			throw new Error(`チャンク${index}の格納位置が不正です`);
		}
		for (let sector = start; sector < start + sectors; sector++) {
			if (usedSectors.has(sector)) throw new Error('MCA内のチャンク格納領域が重複しています');
			usedSectors.add(sector);
		}
		const x = index % 32;
		const z = Math.floor(index / 32);
		if (
			x >= range.minChunkX && x <= range.maxChunkX && z >= range.minChunkZ
			&& z <= range.maxChunkZ
		) {
			chunks.push({ index, start: start * SECTOR_BYTES, sectors });
		}
	}
	if (!chunks.length) throw new Error('指定範囲に保存済みのチャンクがありません');
	const region: McaRegion = {
		sections: new Map(),
		palette: ['minecraft:air'],
		chunkCount: 0,
		blockCount: 0,
		dataVersions: []
	};
	const ids = new Map<string, number>([['minecraft:air', 0], ['minecraft:cave_air', 0], [
		'minecraft:void_air',
		0
	]]);
	const versions = new Set<number>();
	let regionX: number | undefined;
	let regionZ: number | undefined;
	for (const chunk of chunks) {
		try {
			const size = view.getUint32(chunk.start);
			if (size < 1 || size + 4 > chunk.sectors * SECTOR_BYTES) {
				throw new Error('チャンクの長さが不正です');
			}
			const compression = view.getUint8(chunk.start + 4);
			const bytes = await decompressChunk(
				new Uint8Array(buffer, chunk.start + 5, size - 1),
				compression
			);
			const root = readNbt(bytes);
			const level = asCompound(root.Level) ?? root;
			const version = root.DataVersion;
			if (typeof version !== 'number' || !Number.isInteger(version) || version < 1519) {
				throw new Error('Java版1.13以降のブロックパレット形式に対応しています');
			}
			const sections = level.sections ?? level.Sections;
			if (!Array.isArray(sections)) {
				throw new Error(
					'地形のsectionsがありません。entities・poiではなくregionフォルダーのMCAを選択してください'
				);
			}
			const x = level.xPos;
			const z = level.zPos;
			if (
				typeof x !== 'number' || typeof z !== 'number' || !Number.isInteger(x)
				|| !Number.isInteger(z)
				|| ((x % 32) + 32) % 32 !== chunk.index % 32
				|| ((z % 32) + 32) % 32 !== Math.floor(chunk.index / 32)
			) {
				throw new Error('チャンクの座標とヘッダーの位置が一致しません');
			}
			regionX ??= Math.floor(x / 32);
			regionZ ??= Math.floor(z / 32);
			if (
				options.region
				&& (options.region.x !== Math.floor(x / 32)
					|| options.region.z !== Math.floor(z / 32))
			) {
				throw new Error(
					'ファイル名のリージョン座標とチャンクの座標が一致しません。元のr.x.z.mcaの名前を確認してください'
				);
			}
			if (regionX !== Math.floor(x / 32) || regionZ !== Math.floor(z / 32)) {
				throw new Error('異なるリージョンのチャンクが混在しています');
			}
			const seen = new Set<number>();
			for (const value of sections) {
				const section = asCompound(value);
				if (
					!section || typeof section.Y !== 'number' || !Number.isInteger(section.Y)
					|| Math.abs(section.Y) > 2048
				) {
					throw new Error('セクションの高さが不正です');
				}
				if (seen.has(section.Y)) throw new Error('同じ高さのセクションが重複しています');
				seen.add(section.Y);
				const states = asCompound(section.block_states);
				const palette = states?.palette ?? section.Palette;
				// 光源・バイオームだけのセクションにはブロック情報がない。
				if (
					palette === undefined && !states && section.BlockStates === undefined
					&& section.Blocks === undefined
				) continue;
				if (!Array.isArray(palette) || !palette.length || palette.length > 4096) {
					throw new Error('ブロックパレットが不正です');
				}
				const mapped = palette.map((block) => {
					const name = asCompound(block)?.Name;
					if (typeof name !== 'string' || !/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(name)) {
						throw new Error('ブロック名が不正です');
					}
					let id = ids.get(name);
					if (id === undefined) {
						if (region.palette.length >= 65536) {
							throw new Error('ブロックの種類が多すぎます');
						}
						id = region.palette.length;
						ids.set(name, id);
						region.palette.push(name);
					}
					return id;
				});
				const blocks = decodeBlockStates(states?.data ?? section.BlockStates, mapped);
				if (blocks === 0) continue;
				if (region.sections.size >= MAX_SECTION_COUNT) {
					throw new Error('ブロック数が多すぎます。チャンク範囲を狭めてください');
				}
				region.sections.set(sectionKey(x, section.Y, z), { x, y: section.Y, z, blocks });
				region.blockCount += typeof blocks === 'number'
					? 4096
					: blocks.reduce((n, id) => n + Number(id !== 0), 0);
			}
			versions.add(version);
			region.chunkCount++;
			onProgress?.({ stage: 'read', completed: region.chunkCount, total: chunks.length });
		} catch (error) {
			throw new Error(
				`チャンク（${chunk.index % 32}, ${Math.floor(chunk.index / 32)}）: ${
					error instanceof Error ? error.message : '読み込みに失敗しました'
				}`
			);
		}
	}
	region.dataVersions = [...versions].sort((a, b) => a - b);
	return region;
};
