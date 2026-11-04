import type {
	FilterSpecification,
	LayerSpecification,
	Map as MapLibreMap
} from '$routes/map/utils/maplibre';
import { type GeoJSONStoreFeatures, TerraDrawExtend } from 'terra-draw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderedDrawAdapter } from './adapter';

const setup = () => {
	const frames = new Map<number, FrameRequestCallback>();
	let frameId = 0;
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		frames.set(++frameId, callback);
		return frameId;
	});
	vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
	const flush = () => {
		const callbacks = [...frames.values()];
		frames.clear();
		callbacks.forEach(callback => callback(0));
	};
	const canvas = new EventTarget();
	const layers: LayerSpecification[] = [];
	const sources = new Map<string, { setData: ReturnType<typeof vi.fn>; }>();
	const map = {
		getContainer: () => canvas,
		getCanvas: () => canvas,
		dragRotate: { isEnabled: () => false },
		dragPan: { isEnabled: () => true },
		getStyle: () => ({ layers }),
		getLayer: (id: string) => layers.find(layer => layer.id === id),
		addLayer: (layer: LayerSpecification, before?: string) => {
			const index = layers.findIndex(item => item.id === before);
			layers.splice(index < 0 ? layers.length : index, 0, layer);
		},
		removeLayer: (id: string) => layers.splice(layers.findIndex(layer => layer.id === id), 1),
		moveLayer: vi.fn((id: string, before: string) => {
			const [layer] = layers.splice(layers.findIndex(item => item.id === id), 1);
			layers.splice(layers.findIndex(item => item.id === before), 0, layer);
		}),
		setFilter: (id: string, filter: FilterSpecification) => {
			Object.assign(layers.find(layer => layer.id === id)!, { filter });
		},
		addSource: (id: string) => sources.set(id, { setData: vi.fn() }),
		getSource: (id: string) => sources.get(id),
		removeSource: (id: string) => {
			expect(layers.some(layer => 'source' in layer && layer.source === id)).toBe(false);
			sources.delete(id);
		}
	};
	const adapter = new OrderedDrawAdapter(map as unknown as MapLibreMap, [
		'test-point',
		'test-area'
	]);
	adapter.register({
		getState: () => 'started',
		onKeyUp: vi.fn(),
		onKeyDown: vi.fn(),
		onClick: vi.fn(),
		onMouseMove: vi.fn(),
		onDragStart: vi.fn(),
		onDrag: vi.fn(),
		onDragEnd: vi.fn(),
		onClear: vi.fn()
	});
	const featureLayers = () =>
		layers.filter(layer => layer.id.startsWith('morivis-draw-feature-'));
	return { adapter, map, layers, sources, frames, flush, featureLayers };
};
const point = (): GeoJSONStoreFeatures => ({
	type: 'Feature',
	id: 'test-point',
	properties: { mode: 'point' },
	geometry: { type: 'Point', coordinates: [1, 1] }
});
const area = (): GeoJSONStoreFeatures => ({
	type: 'Feature',
	id: 'test-area',
	properties: { mode: 'polygon' },
	geometry: { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 0]]] }
});
const styling = {
	point: TerraDrawExtend.getDefaultStyling,
	polygon: TerraDrawExtend.getDefaultStyling
};
afterEach(() => vi.unstubAllGlobals());

describe('編集中の地物の重ね順', () => {
	it('復元した作成順を使い、更新順が変わっても移動しない', () => {
		const { adapter, flush, featureLayers, map } = setup();
		adapter.render(
			{ created: [area(), point()], updated: [], unchanged: [], deletedIds: [] },
			styling
		);
		flush();
		expect(featureLayers().map(layer => layer.type)).toEqual(['circle', 'fill', 'line']);
		const ids = featureLayers().map(layer => layer.id);
		map.moveLayer.mockClear();
		adapter.render(
			{ created: [], updated: [point()], unchanged: [area()], deletedIds: [] },
			styling
		);
		flush();
		expect(featureLayers().map(layer => layer.id)).toEqual(ids);
		expect(map.moveLayer).not.toHaveBeenCalled();
		adapter.unregister();
	});
	it('新しい点を面より上に置き、編集ハンドルはすべての地物より上に残す', () => {
		const { adapter, flush, layers, featureLayers } = setup();
		adapter.render(
			{ created: [point(), area()], updated: [], unchanged: [], deletedIds: [] },
			styling
		);
		flush();
		const nextPoint = { ...point(), id: 'test-new-point' };
		const handle = {
			...point(),
			id: 'test-handle',
			properties: { mode: 'point', selectionPoint: true }
		};
		adapter.render({
			created: [nextPoint, handle],
			updated: [],
			unchanged: [point(), area()],
			deletedIds: []
		}, styling);
		flush();
		expect(featureLayers().map(layer => layer.type)).toEqual([
			'circle',
			'fill',
			'line',
			'circle'
		]);
		expect(featureLayers().some(layer => layer.id.includes('test-handle'))).toBe(false);
		const handles = layers.findIndex(layer => layer.id === 'morivis-draw-point');
		expect(featureLayers().every(layer => layers.indexOf(layer) < handles)).toBe(true);
		expect(layers[handles]).toMatchObject({
			filter: ['in', ['id'], ['literal', ['test-handle']]]
		});
		adapter.unregister();
	});
	it('削除と終了時に地物レイヤーを外し、予約済み描画も残さない', () => {
		const { adapter, flush, featureLayers, layers, sources, frames } = setup();
		adapter.render(
			{ created: [point(), area()], updated: [], unchanged: [], deletedIds: [] },
			styling
		);
		flush();
		adapter.render({
			created: [],
			updated: [],
			unchanged: [area()],
			deletedIds: ['test-point']
		}, styling);
		flush();
		expect(featureLayers().map(layer => layer.type)).toEqual(['fill', 'line']);
		adapter.render({ created: [], updated: [area()], unchanged: [], deletedIds: [] }, styling);
		adapter.unregister();
		flush();
		expect(layers).toEqual([]);
		expect(sources.size).toBe(0);
		expect(frames.size).toBe(0);
	});
});
