import { createGeoJson3DEntry } from '$routes/map/data/entries/model';
import type { MultiPolygon3DFeatureCollection } from '$routes/map/types/geojson';
import { GeoJsonLayer } from '@deck.gl/layers';
import { describe, expect, it, vi } from 'vitest';
import { createGeoJsonColorAccessors, getGeoJsonColorProperties } from './geojson-color';
import { createDeckVectorLayer } from './overlay';

vi.mock('@geoarrow/deck.gl-layers', () => ({
	GeoArrowPathLayer: vi.fn(),
	GeoArrowPolygonLayer: vi.fn(),
	GeoArrowScatterplotLayer: vi.fn()
}));

describe('3D GeoJSONの属性色', () => {
	it('面と線に地物ごとの色を使い、短縮HEXも読める', () => {
		const accessors = createGeoJsonColorAccessors({ color: '#123456', colorProperty: 'color' });
		if (
			typeof accessors.getFillColor !== 'function'
			|| typeof accessors.getLineColor !== 'function'
		) {
			throw new Error('属性色のアクセサーがありません');
		}
		expect(accessors.getFillColor({ properties: { color: '#ff0000' } })).toEqual([
			255,
			0,
			0,
			180
		]);
		expect(accessors.getFillColor({ properties: { color: '#0F0' } })).toEqual([0, 255, 0, 180]);
		expect(accessors.getLineColor({ properties: { color: '#0F0' } })).toEqual([0, 255, 0, 220]);
	});

	it('不正値・欠損値には補助色を使う', () => {
		const { getFillColor } = createGeoJsonColorAccessors({
			color: '#123456',
			colorProperty: 'color'
		});
		if (typeof getFillColor !== 'function') throw new Error('属性色のアクセサーがありません');
		for (
			const properties of [{}, null, { color: 'invalid' }, { color: 42 }, { color: '#12' }]
		) {
			expect(getFillColor({ properties })).toEqual([18, 52, 86, 180]);
		}
	});

	it('単色に切り替えたときは定数色を使い、更新対象も切り替わる', () => {
		const style = { color: '#123456', colorProperty: 'color' as string | undefined };
		const before = createGeoJsonColorAccessors(style);
		style.colorProperty = undefined;
		style.color = '#abcdef';
		const after = createGeoJsonColorAccessors(style);
		expect(after.getFillColor).toEqual([171, 205, 239, 180]);
		expect(after.getLineColor).toEqual([171, 205, 239, 220]);
		expect(after.updateTriggers.getFillColor).toEqual(['#abcdef', undefined]);
		expect(after.updateTriggers.getLineColor).not.toEqual(before.updateTriggers.getLineColor);
	});

	it('有効な色コードを持つ属性だけを選択肢にする', () => {
		expect(getGeoJsonColorProperties({
			features: [
				{ properties: { color: '#f00', name: 'test-mesh', count: 4 } },
				{ properties: { color: '#00ff00', alternate: '#123456', invalid: '#xyz' } },
				{ properties: null }
			]
		})).toEqual(['alternate', 'color']);
	});

	it('GeoJsonLayerへ属性色と再描画条件を渡し、3Dの面描画を保持する', () => {
		const data: MultiPolygon3DFeatureCollection = {
			type: 'FeatureCollection',
			features: [{
				type: 'Feature',
				properties: { color: '#ff0000' },
				geometry: {
					type: 'MultiPolygon',
					coordinates: [[[[1, 2, 3], [4, 2, 3], [4, 2, 6], [1, 2, 3]]]]
				}
			}]
		};
		const entry = createGeoJson3DEntry('test-mesh', data, 'Polygon', [1, 2, 4, 2]);
		entry.style.colorProperty = 'color';
		const layer = createDeckVectorLayer(entry);
		if (!(layer instanceof GeoJsonLayer)) throw new Error('GeoJsonLayerではありません');
		expect(layer.props.data).toBe(data);
		expect(layer.props.getFillColor).toEqual(expect.any(Function));
		expect(layer.props.getLineColor).toEqual(expect.any(Function));
		expect(layer.props.updateTriggers?.getFillColor).toEqual([entry.style.color, 'color']);
		expect(layer.props.updateTriggers?.getLineColor).toEqual([entry.style.color, 'color']);
		expect(layer.props._full3d).toBe(true);
		expect(layer.props.extruded).toBe(false);
	});
});
