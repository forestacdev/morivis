import { describe, expect, it } from 'vitest';
import { chunkFixture, regionFixture } from './__fixtures__/region';
import { readMcaRegion } from './region';
import { MCA_TILE_SIZE, renderMcaSurfaceTile } from './surface-tile';

describe('MCAリージョンの地表タイル', () => {
	it('負座標のリージョンでも南東端まで512角に収め、未生成チャンクは透明にする', async () => {
		const region = await readMcaRegion(regionFixture([{
			index: 1023,
			nbt: chunkFixture({ x: -1, z: -1, y: -4, palette: ['minecraft:water'] })
		}]));
		const pixels = renderMcaSurfaceTile(region);
		expect(pixels.length).toBe(512 * 512 * 4);
		expect([...pixels.slice(-4)]).toEqual([63, 118, 196, 255]);
		expect([...pixels.slice(0, 4)]).toEqual([0, 0, 0, 0]);
	});

	it('最上部の非空気ブロックを描き、その下の地表と北隣との高低差を残す', async () => {
		const region = await readMcaRegion(regionFixture([{
			nbt: chunkFixture({ y: -1, palette: ['minecraft:stone'] })
		}]));
		const blocks = new Uint16Array(4096);
		region.palette.push('minecraft:water');
		blocks[3 * 256 + 1] = 2;
		region.sections.set('0,0,0', { x: 0, y: 0, z: 0, blocks });
		const pixels = renderMcaSurfaceTile(region);
		const pixel = (x: number, z: number) => {
			const offset = (z * MCA_TILE_SIZE + x) * 4;
			return [...pixels.slice(offset, offset + 4)];
		};
		expect(pixel(1, 0)).toEqual([63, 118, 196, 255]);
		expect(pixel(0, 1)).toEqual([133, 133, 130, 255]);
		expect(pixel(1, 1)[0]).toBeLessThan(pixel(0, 1)[0]);
	});
});
