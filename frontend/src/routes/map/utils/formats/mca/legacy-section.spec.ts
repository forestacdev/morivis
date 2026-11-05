import { expect, it } from 'vitest';
import { chunkFixture, nbtFixture, regionFixture, tag } from './__fixtures__/region';
import { mcaToGlb } from './index';
import { readMcaRegion } from './region';
import { renderMcaSurfaceTile } from './surface-tile';

const legacyChunk = (blocks: Uint8Array, data: Uint8Array, add?: Uint8Array, version?: number) =>
	nbtFixture({
		...(version !== undefined && { DataVersion: tag(3, version) }),
		Level: tag(10, {
			xPos: tag(3, 0),
			zPos: tag(3, 0),
			Sections: tag(9, {
				type: 10,
				values: [{
					Y: tag(1, 0),
					Blocks: tag(7, blocks),
					Data: tag(7, data),
					...(add && { Add: tag(7, add) })
				}]
			})
		})
	});

it('DataVersionのない旧チャンクと新チャンクから同じパレットで地表・GLBを作る', async () => {
	const blocks = new Uint8Array(4096), data = new Uint8Array(2048), add = new Uint8Array(2048);
	blocks.set([35, 44, 0, 0]);
	data.set([0x8e, 0x21]);
	add[1] = 0x21;
	const input = regionFixture([
		{ nbt: legacyChunk(blocks, data, add) },
		{ index: 1, nbt: chunkFixture({ x: 1, palette: ['minecraft:red_wool'] }) }
	]);
	const region = await readMcaRegion(input);
	expect(region.dataVersions).toEqual([2865]);
	expect(region.chunkCount).toBe(2);
	const ids = region.sections.get('0,0,0')!.blocks as Uint16Array;
	expect([...ids.slice(0, 5)].map(id => region.palette[id])).toEqual([
		'minecraft:red_wool',
		'minecraft:stone_slab',
		'legacy:block_256_1',
		'legacy:block_512_2',
		'minecraft:air'
	]);
	expect(region.sections.get('1,0,0')?.blocks).toBe(ids[0]);
	expect(region.shapes?.[ids[1]]).toBe('slab-top');
	expect(region.states?.[ids[1]]).toEqual({ type: 'top' });
	expect([...renderMcaSurfaceTile(region).slice(0, 4)]).toEqual([180, 59, 52, 255]);
	expect((await mcaToGlb(input)).glb.byteLength).toBeGreaterThan(0);
});

it('Addを省略した旧セクションを読み、単一状態は圧縮して保持する', async () => {
	const nbt = legacyChunk(new Uint8Array(4096).fill(1), new Uint8Array(2048), undefined, 1343);
	const region = await readMcaRegion(regionFixture([{ nbt }]));
	expect(region.sections.get('0,0,0')?.blocks).toBe(1);
	expect(region.palette[1]).toBe('minecraft:stone');
	expect(region.dataVersions).toEqual([1343]);
});

it.each([[4095, 2048, 2048, 'Blocks'], [4096, 1, 2048, 'Data'], [4096, 2048, 1, 'Add']] as const)(
	'旧セクションの不正な配列長を検出する（%i, %i, %i）',
	async (blocks, data, add, name) => {
		const nbt = legacyChunk(new Uint8Array(blocks), new Uint8Array(data), new Uint8Array(add));
		await expect(readMcaRegion(regionFixture([{ nbt }]))).rejects.toThrow(name);
	}
);
