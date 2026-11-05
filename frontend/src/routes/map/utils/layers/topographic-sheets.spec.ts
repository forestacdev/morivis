import { parseTopographicSheetTileUrl } from '$routes/map/protocol/vector/geojson/topographic-sheets/request';
import { describe, expect, it } from 'vitest';
import { createTopographicSheetsStyle } from './topographic-sheets';

describe('地形図図郭の表示縮尺', () => {
	it('オフのときは配信データを要求しない', () => {
		expect(createTopographicSheetsStyle(false, ['test-font'])).toEqual({
			sources: {},
			layers: []
		});
	});
	it('ズーム境界で縮尺が重ならず、2万5千分1を拡大表示できる', () => {
		const { sources, layers } = createTopographicSheetsStyle(true, ['test-font']);
		for (let zoom = 0; zoom < 24; zoom += 0.5) {
			const visible = layers.filter(layer =>
				layer.type === 'line' && zoom >= layer.minzoom! && zoom < layer.maxzoom!
			);
			expect(visible).toHaveLength(zoom < 5 ? 0 : 1);
			if (zoom < 5) continue;
			const scale = zoom < 9 ? 200000 : zoom < 11 ? 50000 : 25000;
			expect(visible[0].id).toBe(`topographic-sheets-${scale}-line`);
			const source = sources[`topographic-sheets-${scale}`];
			if (source.type !== 'vector') throw new Error('Expected vector tiles');
			const url = source.tiles![0].replace(
				'{z}',
				String(Math.min(Math.floor(zoom), source.maxzoom!))
			).replace('{x}', '0').replace('{y}', '0');
			expect(url).toMatch(/^geojson:\/\//);
			const request = new URL(url.replace('geojson://', ''));
			expect(request.searchParams.get('transform')).toBe('topographic-sheets');
			expect(visible[0]).toMatchObject({ 'source-layer': 'geojsonLayer' });
			expect(parseTopographicSheetTileUrl(request.origin + request.pathname).scale).toBe(
				scale
			);
		}
	});
});
