import { getLayerFeaturePanelSummary } from '$routes/map/components/feature_menu/feature-panel-summary';
import type { FeatureMenuData } from '$routes/map/types';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { resolveImageUrl } from '$routes/map/utils/icon';
import { createVectorLayer } from '$routes/map/utils/layers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVideoPointEntry } from './point';

vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));

afterEach(() => {
	GeojsonCache.clear();
	vi.restoreAllMocks();
});

describe('位置情報付き動画のポイント登録', () => {
	it('撮影地点を先頭フレームの写真アイコンで表示し、詳細画面に動画を渡す', async () => {
		vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-video');
		const entry = await createVideoPointEntry(
			new File(['test'], 'test-video.mp4'),
			{ longitude: 2.5, latitude: 1.25, altitude: 12.5 },
			'data:image/png;base64,test-frame',
			new AbortController().signal
		);
		const feature = GeojsonCache.get(entry.id)!.features[0];
		expect(feature.geometry).toEqual({ type: 'Point', coordinates: [2.5, 1.25] });
		expect(entry.format.geometryType).toBe('Point');
		expect(entry.properties.attributeView.popupKeys).not.toContain('videoUrl');
		expect(entry.properties.attributeView.popupKeys).not.toContain('iconImageUrl');
		const icon = entry.properties.images?.icon;
		expect(resolveImageUrl(feature.properties, icon)).toBe('data:image/png;base64,test-frame');
		const layer = createVectorLayer(
			{ id: entry.id, source: `${entry.id}_source`, minzoom: 0, maxzoom: 24 },
			entry.style,
			entry.properties.fields,
			icon
		);
		expect(layer?.type).toBe('symbol');
		expect(layer?.paint).toMatchObject({ 'icon-opacity': 1 });
		const summary = await getLayerFeaturePanelSummary(
			{ layerId: entry.id, properties: feature.properties } as FeatureMenuData,
			[entry]
		);
		expect(summary?.media).toEqual([{
			type: 'video',
			url: 'blob:test-video',
			title: 'test-video'
		}]);
	});
	it('エントリー生成途中の中断ではURLとキャッシュを解放する', async () => {
		vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-video');
		const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
		const controller = new AbortController();
		const pending = createVideoPointEntry(
			new File(['test'], 'test-video.mp4'),
			{ longitude: 0, latitude: 0 },
			undefined,
			controller.signal
		);
		controller.abort();
		await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
		expect(revoke).toHaveBeenCalledWith('blob:test-video');
		expect([...GeojsonCache.keys()]).toEqual([]);
	});
});
