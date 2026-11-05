import type { StyleSpecification } from '$routes/map/utils/maplibre';
import { describe, expect, it } from 'vitest';
import { preserveDrawStyle } from './style';

const style = (): StyleSpecification => ({ version: 8, sources: {}, layers: [] });

describe('描画runtimeのstyle更新', () => {
	it('通常レイヤーを更新し、編集中のsourceとlayerを保持する', () => {
		const previous = style();
		previous.sources['morivis-draw-point'] = {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: [{
					type: 'Feature',
					geometry: { type: 'Point', coordinates: [1, 2] },
					properties: {}
				}]
			}
		};
		previous.layers = [
			{ id: 'test-old-background', type: 'background' },
			{ id: 'morivis-draw-point', type: 'circle', source: 'morivis-draw-point' }
		];
		const next = style();
		next.layers = [{ id: 'test-new-background', type: 'background' }];
		const result = preserveDrawStyle(previous, next);
		expect(result.sources['morivis-draw-point']).toEqual(
			previous.sources['morivis-draw-point']
		);
		expect(result.layers.map(layer => layer.id)).toEqual([
			'test-new-background',
			'morivis-draw-point'
		]);
		expect(next.layers).toHaveLength(1);
	});
	it('初回と描画終了後にはruntimeのレイヤーを持ち込まない', () => {
		const next = style();
		expect(preserveDrawStyle(undefined, next)).toEqual(next);
		expect(preserveDrawStyle(style(), next)).toEqual(next);
	});
});
