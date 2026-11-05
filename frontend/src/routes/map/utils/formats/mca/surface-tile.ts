import { blockColor } from './colors';
import type { McaRegion } from './types';

export const MCA_TILE_SIZE = 512;

/** 北を上に、最上部の非空気ブロックを1ブロック1画素で描く。未生成部分は透明。 */
export const renderMcaSurfaceTile = (region: McaRegion) => {
	const size = MCA_TILE_SIZE;
	const pixels = new Uint8ClampedArray(size * size * 4);
	const heights = new Int32Array(size * size);
	const colors = region.palette.map(blockColor);
	const sections = [...region.sections.values()].sort((a, b) => b.y - a.y);
	for (const section of sections) {
		const left = (section.x & 31) * 16;
		const top = (section.z & 31) * 16;
		for (let column = 0; column < 256; column++) {
			const pixel = (top + (column >> 4)) * size + left + (column & 15);
			const offset = pixel * 4;
			if (pixels[offset + 3]) continue;
			let y = 15;
			let id = section.blocks;
			if (typeof id !== 'number') {
				const blocks = id;
				while (y >= 0 && !blocks[y * 256 + column]) y--;
				if (y < 0) continue;
				id = blocks[y * 256 + column];
			}
			if (!id) continue;
			const color = colors[id];
			pixels[offset] = color >>> 16;
			pixels[offset + 1] = (color >>> 8) & 255;
			pixels[offset + 2] = color & 255;
			pixels[offset + 3] = 255;
			heights[pixel] = section.y * 16 + y;
		}
	}
	for (let pixel = size; pixel < heights.length; pixel++) {
		const offset = pixel * 4;
		if (!pixels[offset + 3] || !pixels[offset - size * 4 + 3]) continue;
		const slope = Math.max(-3, Math.min(3, heights[pixel] - heights[pixel - size]));
		const shade = 1 + slope * 0.06;
		for (let channel = 0; channel < 3; channel++) pixels[offset + channel] *= shade;
	}
	return pixels;
};
