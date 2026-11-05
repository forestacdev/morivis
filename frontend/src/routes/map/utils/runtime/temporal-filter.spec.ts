import { DEFAULT_VECTOR_POLYGON_STYLE } from '$routes/map/data/entries/vector/_style';
import type { GeoJsonMetaData, MorivisVectorEntry } from '$routes/map/data/types/vector';
import { createSublayerId } from '$routes/map/utils/layers/id';
import { getTemporalFilter } from '$routes/map/utils/layers/vector/filter';
import { beforeEach, expect, it, vi } from 'vitest';
import { temporalEntry } from './__fixtures__/temporal';
import { applyTemporalFilter } from './temporal-filter';

const mocks = vi.hoisted(() => ({
	getLayer: vi.fn(),
	setFilter: vi.fn(),
	setRuntimeFilter: vi.fn()
}));
vi.mock('$routes/stores/map', () => ({ mapStore: mocks }));
vi.mock('$routes/map/utils/layers/highlight', () => ({ HighlightLayerRegistry: mocks }));
vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));
beforeEach(() => {
	vi.clearAllMocks();
	mocks.getLayer.mockReturnValue({});
});

it('通常描画と同じ時間条件を派生レイヤーとハイライトへ渡す', async () => {
	const entry = await temporalEntry();
	entry.style.colors.show = true;
	entry.style.labels.show = true;
	const filter = getTemporalFilter(entry);
	applyTemporalFilter(entry);
	expect(mocks.setFilter.mock.calls).toEqual([
		[entry.id, filter],
		[createSublayerId(entry.id, 'point_icon'), filter],
		[createSublayerId(entry.id, 'label'), filter]
	]);
	expect(mocks.setRuntimeFilter).toHaveBeenCalledWith(entry.id, filter);
});
it('単一時刻と無効化を反映し、存在しないレイヤーは操作しない', async () => {
	const entry = await temporalEntry();
	entry.state!.temporalFilter!.mode = 'single_start';
	mocks.getLayer.mockImplementation(id => id === entry.id ? {} : undefined);
	applyTemporalFilter(entry);
	expect(mocks.setFilter).toHaveBeenLastCalledWith(entry.id, ['==', [
		'coalesce',
		['get', 'time'],
		['get', 'otherTime'],
		''
	], 'test-0']);
	entry.state!.temporalFilter!.enabled = false;
	applyTemporalFilter(entry);
	expect(mocks.setFilter).toHaveBeenLastCalledWith(entry.id, null);
	expect(mocks.setRuntimeFilter).toHaveBeenLastCalledWith(entry.id, null);
});
it('タイル由来の面にも時間条件を維持して押し出し・輪郭・ラベルへ反映する', async () => {
	const point = await temporalEntry();
	const entry: MorivisVectorEntry<GeoJsonMetaData> = {
		...point,
		format: {
			type: 'mvt',
			geometryType: 'Polygon',
			url: 'https://example.test/{z}/{x}/{y}.pbf'
		},
		style: structuredClone(DEFAULT_VECTOR_POLYGON_STYLE)
	};
	entry.style.colors.show = true;
	entry.style.labels.show = true;
	entry.style.outline.show = true;
	entry.style.extrusion = { ...entry.style.extrusion!, show: true };
	applyTemporalFilter(entry);
	expect(getTemporalFilter(entry)).toBeDefined();
	expect(mocks.setFilter.mock.calls.map(([id]) => id)).toEqual([
		entry.id,
		...(['fill_extrusion_pattern', 'fill_outline', 'fill_extrusion', 'label'] as const).map(
			role => createSublayerId(entry.id, role)
		)
	]);
});
