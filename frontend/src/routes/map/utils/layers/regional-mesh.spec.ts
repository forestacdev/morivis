import { describe, expect, it } from 'vitest';
import { createRegionalMeshStyle } from './regional-mesh';

describe('地域メッシュ補助表示のスタイル', () => {
	it('非表示時はソースとレイヤーを生成しない', () => {
		expect(createRegionalMeshStyle(false, ['test-font'])).toEqual({ sources: {}, layers: [] });
	});

	it('ズーム境界で1種類のメッシュだけを表示する', () => {
		const { sources, layers } = createRegionalMeshStyle(true, ['test-font']);
		expect(Object.keys(sources)).toHaveLength(6);
		expect(new Set(layers.map(layer => layer.id)).size).toBe(layers.length);
		for (
			const [zoom, level] of [[0, 1], [7.99, 1], [8, 2], [11, 3], [14, 4], [15, 5], [16, 6], [
				22,
				6
			]]
		) {
			const visible = layers.filter(layer =>
				layer.type === 'line' && layer.id.endsWith('-line') && zoom >= layer.minzoom!
				&& zoom < layer.maxzoom!
			);
			expect(visible.map(layer => layer.id)).toEqual([`regional-mesh-${level}-line`]);
		}
		for (const layer of layers) {
			if ('source' in layer) expect(sources[layer.source as string]).toBeDefined();
			if (layer.type === 'symbol') expect(layer.layout?.['text-font']).toEqual(['test-font']);
		}
	});
});
