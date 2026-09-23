import { parseH3TileUrl } from '$routes/map/protocol/vector/h3/request';
import { describe, expect, it } from 'vitest';
import { createH3Style } from './h3';

describe('H3補助レイヤーのスタイル', () => {
	it('オフのときはタイル要求を発生させない', () => {
		expect(createH3Style(false, ['test-font'])).toEqual({ sources: {}, layers: [] });
	});
	it('どのズームでも単一の解像度を表示し、有効なタイルURLを生成する', () => {
		const { sources, layers } = createH3Style(true, ['test-font']);
		for (let zoom = 0; zoom < 24; zoom += 0.5) {
			const visible = layers.filter(layer =>
				layer.id.endsWith('-line') && zoom >= layer.minzoom! && zoom < layer.maxzoom!
			);
			expect(visible).toHaveLength(1);
			const layer = visible[0];
			if (!('source' in layer)) throw new Error('Missing source');
			const source = sources[layer.source as string];
			if (source.type !== 'vector') throw new Error('Expected vector tiles');
			const url = source.tiles![0].replace('{z}', String(Math.floor(zoom))).replace(
				'{x}',
				'0'
			).replace('{y}', '0');
			expect(() => parseH3TileUrl(url)).not.toThrow();
		}
	});
});
