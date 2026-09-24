import { describe, expect, it } from 'vitest';
import { nbtFixture, packedStates, regionFixture, tag, type TestTag } from './__fixtures__/region';
import { readMcaRegion } from './region';

const paletteRegion = (type: number, values: unknown[]) =>
	regionFixture([{
		nbt: nbtFixture({
			DataVersion: tag(3, 6000),
			xPos: tag(3, 0),
			zPos: tag(3, 0),
			sections: tag(9, {
				type: 10,
				values: [{
					Y: tag(1, 0),
					block_states: tag(10, {
						palette: tag(9, { type, values }),
						...(values.length > 1
							? {
								data: tag(
									12,
									packedStates(
										Array.from({ length: 4096 }, (_, i) => i % values.length),
										values.length
									)
								)
							}
							: {})
					})
				}]
			})
		})
	}]);

describe('MCA compact block palettes', () => {
	it('文字列の単一パレットと空気を読む', async () => {
		const solid = await readMcaRegion(paletteRegion(8, ['test:solid']));
		expect(solid.palette).toEqual(['minecraft:air', 'test:solid']);
		expect(solid.blockCount).toBe(4096);
		const air = await readMcaRegion(paletteRegion(8, ['minecraft:air']));
		expect(air.blockCount).toBe(0);
	});
	it('混在リストの文字列と新旧の状態指定を同じパレットに正規化する', async () => {
		const region = await readMcaRegion(paletteRegion(10, [
			{ '': tag(8, 'minecraft:air') },
			{ '': tag(8, 'test:solid') },
			{ id: tag(8, 'test:panel'), properties: tag(10, { facing: tag(8, 'east') }) },
			{ Name: tag(8, 'test:panel'), Properties: tag(10, { facing: tag(8, 'east') }) }
		]));
		expect(region.palette).toEqual(['minecraft:air', 'test:solid', 'test:panel']);
		expect(region.states?.[2]).toEqual({ facing: 'east' });
		expect(region.blockCount).toBe(3072);
		expect(Array.from(region.sections.get('0,0,0')!.blocks as Uint16Array).slice(0, 4))
			.toEqual([0, 1, 2, 2]);
	});
	it('小文字のpropertiesからハーフブロックの形状を復元する', async () => {
		const region = await readMcaRegion(paletteRegion(10, [{
			id: tag(8, 'minecraft:test_slab'),
			properties: tag(10, { type: tag(8, 'top') })
		}]));
		expect(region.shapes?.[1]).toBe('slab-top');
	});
	it.each([
		{ id: tag(3, 1) },
		{ '': tag(3, 1) },
		{ '': tag(8, 'test:solid'), extra: tag(8, 'test') }
	] as Record<string, TestTag>[])('不正な名前や曖昧なラッパーを拒否する: %j', async (value) => {
		await expect(readMcaRegion(paletteRegion(10, [value]))).rejects.toThrow('ブロック名が不正');
	});
});
