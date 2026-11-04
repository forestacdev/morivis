import type { FeatureCollection } from 'geojson';
import { describe, expect, it } from 'vitest';
import { createDrawLayers, drawFeatureKey } from './draw';

const drawing = (): FeatureCollection => ({
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties: { id: 'test-point', color: '#ff0000', opacity: 1 },
			geometry: { type: 'Point', coordinates: [1, 1] }
		},
		{
			type: 'Feature',
			properties: { id: 'test-polygon', color: '#0000ff', opacity: 0.4 },
			geometry: { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 0]]] }
		},
		{
			type: 'Feature',
			properties: { id: 'test-line', color: '#00ff00', opacity: 1 },
			geometry: { type: 'LineString', coordinates: [[0, 1], [2, 1]] }
		}
	]
});

describe('描画地物のレイヤー', () => {
	it('種類を混在させた作成順で、一地物ごとにIDで絞ったレイヤーを作る', () => {
		const data = drawing();
		const layers = createDrawLayers(data);
		expect(layers.map(layer => layer.type)).toEqual(['circle', 'fill', 'line']);
		expect(layers.map(layer => 'filter' in layer && layer.filter)).toEqual(
			data.features.map(feature => ['==', ['id'], feature.properties!.id])
		);
	});
	it('編集でIDと順番が変わらず、削除した地物のレイヤーは残らない', () => {
		const data = drawing();
		const ids = createDrawLayers(data).map(layer => layer.id);
		data.features[0].properties!.color = '#ffffff';
		data.features[0].geometry = { type: 'Point', coordinates: [1, 2] };
		expect(createDrawLayers(data).map(layer => layer.id)).toEqual(ids);
		data.features.splice(1, 1);
		expect(createDrawLayers(data).map(layer => layer.id)).toEqual([ids[0], ids[2]]);
	});
	it('空データはレイヤーを作らず、数値IDと文字列IDを区別する', () => {
		expect(createDrawLayers({ type: 'FeatureCollection', features: [] })).toEqual([]);
		expect(drawFeatureKey(1)).not.toBe(drawFeatureKey('1'));
	});
});
