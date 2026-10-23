import { getVectorTemporalItems } from '$routes/map/data/types/vector/properties';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { beforeEach, expect, it, vi } from 'vitest';
import { temporalData, temporalEntry } from './__fixtures__/temporal';
import { createTemporalCameraTracker } from './temporal-camera';

const map = vi.hoisted(() => ({
	getMap: vi.fn(),
	getTerrain: vi.fn(),
	setCamera: vi.fn(),
	resetCamera: vi.fn(),
	easeTo: vi.fn(),
	fitBounds: vi.fn()
}));
const camera = vi.hoisted(() => ({ flyTo: vi.fn(), getCenter: vi.fn(), getBearing: vi.fn() }));
vi.mock('$routes/stores/map', () => ({ mapStore: map }));
vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));
beforeEach(() => {
	vi.clearAllMocks();
	GeojsonCache.clear();
	map.getMap.mockReturnValue(camera);
	map.getTerrain.mockReturnValue(undefined);
	camera.getCenter.mockReturnValue({ lng: 0, lat: 0 });
	camera.getBearing.mockReturnValue(0);
});
const setup = async () => {
	const entry = await temporalEntry();
	GeojsonCache.set(entry.id, temporalData());
	const items = getVectorTemporalItems(entry.properties.temporal);
	const options = { entry, items, keys: ['time'], index: 1, auto: false, duration: 220 };
	const tracker = createTemporalCameraTracker({
		getEntry: () => options.entry,
		getItems: () => options.items,
		getKeys: () => options.keys,
		getIndex: () => options.index,
		getAutoBearing: () => options.auto,
		getDuration: () => options.duration
	});
	return { options, tracker };
};
it('現在の時刻・追跡設定を読み、点への移動と地形カメラを同期する', async () => {
	const { options, tracker } = await setup();
	tracker.trackCurrentFeature();
	expect(camera.flyTo).toHaveBeenLastCalledWith({
		center: expect.objectContaining({ lng: 0.001, lat: 0 }),
		duration: 220
	});
	expect(map.setCamera).not.toHaveBeenCalled();
	options.index = 2;
	options.auto = true;
	options.duration = 400;
	map.getTerrain.mockReturnValue({});
	tracker.trackCurrentFeature();
	expect(camera.flyTo).toHaveBeenLastCalledWith({
		center: expect.objectContaining({ lng: 0.002, lat: 0 }),
		bearing: 90,
		duration: 400
	});
	expect(map.setCamera).toHaveBeenCalledWith(expect.objectContaining({ lng: 0.002, lat: 0 }));
	tracker.resetTerrain();
	expect(map.resetCamera).toHaveBeenCalledOnce();
});
it('線の追跡はbboxへ移動する', async () => {
	const { options, tracker } = await setup();
	GeojsonCache.set(options.entry.id, {
		type: 'FeatureCollection',
		features: [{
			type: 'Feature',
			properties: { time: 'test-1' },
			geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }
		}]
	});
	tracker.trackCurrentFeature();
	expect(map.fitBounds).toHaveBeenCalledWith([0, 0, 1, 1], {
		padding: 48,
		duration: 0,
		animate: false
	});
});
it('軌跡追跡の補間状態をresetし、新しいGeoJSONでキャッシュを作り直す', async () => {
	const { options, tracker } = await setup();
	options.auto = true;
	expect(tracker.trackRoute(1)).toBe(true);
	const first = map.easeTo.mock.calls[0][0];
	tracker.trackRoute(1);
	expect(map.easeTo.mock.calls[1][0].center.lng).toBeGreaterThan(first.center.lng);
	tracker.reset();
	tracker.trackRoute(1);
	expect(map.easeTo.mock.calls[2][0]).toEqual(first);
	const replacement = temporalData();
	replacement.features.forEach(feature => {
		if (feature.geometry.type === 'Point') feature.geometry.coordinates[1] = 1;
	});
	GeojsonCache.set(options.entry.id, replacement);
	tracker.reset();
	tracker.trackRoute(1);
	expect(map.easeTo.mock.calls[3][0].center.lat).toBeCloseTo(0.18);
	tracker.invalidate();
	GeojsonCache.remove(options.entry.id);
	expect(tracker.trackRoute(1)).toBe(false);
});
it('別のレイヤーへ切り替えると新しいエントリーを追跡する', async () => {
	const { options, tracker } = await setup();
	options.entry = { ...options.entry, id: 'test-other' };
	tracker.trackCurrentFeature();
	expect(camera.flyTo).not.toHaveBeenCalled();
	const other = temporalData();
	if (other.features[1].geometry.type === 'Point') {
		other.features[1].geometry.coordinates = [1, 2];
	}
	GeojsonCache.set(options.entry.id, other);
	tracker.trackCurrentFeature();
	expect(camera.flyTo).toHaveBeenCalledWith({
		center: expect.objectContaining({ lng: 1, lat: 2 }),
		duration: 220
	});
});
it('地図がない場合、点と軌跡のカメラを更新しない', async () => {
	const { tracker } = await setup();
	map.getMap.mockReturnValue(undefined);
	tracker.trackCurrentFeature();
	tracker.trackRoute(1);
	expect(camera.flyTo).not.toHaveBeenCalled();
	expect(map.easeTo).not.toHaveBeenCalled();
});
