import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
import type { FeatureCollection } from '$routes/map/types/geojson';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { JoinDataCache } from '$routes/map/utils/cache/join-data-cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSourcesItems } from './index';
import { getRasterTiffImageSource, prepareSourceData } from './prepare';
import { applyRasterVisualizationUpdates } from './raster-updates';

const mocks = vi.hoisted(() => ({
	getGeojson: vi.fn(),
	getFgbToGeojson: vi.fn(),
	getMetadata: vi.fn(),
	loadRasterData: vi.fn(),
	imageSet: vi.fn(),
	revokeOldEntries: vi.fn(),
	hasNetcdf: vi.fn(),
	updateTimeStep: vi.fn(),
	getDataRanges: vi.fn()
}));
vi.mock('$routes/map/utils/formats/geojson', () => mocks);
vi.mock('$routes/map/utils/cache/raster/geotiff-cache', () => ({
	GeoTiffCache: { getDataRanges: mocks.getDataRanges },
	GeoTiffImageCache: {
		has: () => false,
		set: mocks.imageSet,
		revokeOldEntries: mocks.revokeOldEntries
	}
}));
vi.mock(
	'$routes/map/utils/formats/geotiff',
	() => ({
		ensureRasterDerivedCache: vi.fn(),
		getTopexCacheKey: vi.fn(),
		getTwiCacheKey: vi.fn(),
		loadRasterData: mocks.loadRasterData
	})
);
vi.mock(
	'$routes/map/utils/formats/geotiff/cog_tile_manager',
	() => ({ CogTileManager: { getMetadata: mocks.getMetadata } })
);
vi.mock(
	'$routes/map/utils/formats/netcdf/cache',
	() => ({ NetCDFDataCache: { has: mocks.hasNetcdf, updateTimeStep: mocks.updateTimeStep } })
);
vi.mock(
	'$routes/map/utils/platform/request',
	() => ({ resolveRequestUrl: (url: string) => `test-proxy:${url}` })
);

const vectorEntry = (id: string, format = 'geojson'): MorivisLayerEntry => ({
	id,
	type: 'vector',
	format: { type: format, url: `https://example.test/${id}` },
	properties: {},
	style: { visible: true },
	metaData: { minZoom: 0, maxZoom: 10, bounds: [0, 0, 1, 1] }
} as MorivisLayerEntry);

beforeEach(() => {
	GeojsonCache.clear();
	JoinDataCache.clear();
	vi.clearAllMocks();
	mocks.hasNetcdf.mockReturnValue(false);
	mocks.getDataRanges.mockReturnValue([]);
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('ソースの非同期準備', () => {
	it('取得したGeoJSONをキャッシュに保存し、次回は再取得しない', async () => {
		const data: FeatureCollection = { type: 'FeatureCollection', features: [] };
		mocks.getGeojson.mockResolvedValue(data);
		const entry = vectorEntry('test-vector');
		const prepared = await prepareSourceData([entry]);
		expect(prepared['test-vector'].geojson).toEqual(data);
		const sources = createSourcesItems({
			entries: [entry],
			prepared,
			mode: 'preview',
			baseMap: null
		});
		expect(sources['test-vector_source']).toMatchObject({ data });
		await prepareSourceData([entry]);
		expect(mocks.getGeojson).toHaveBeenCalledTimes(1);
	});

	it('FGBの取得失敗を伝播し、不完全なデータをキャッシュしない', async () => {
		mocks.getFgbToGeojson.mockRejectedValue(new Error('test-load-failure'));
		await expect(prepareSourceData([vectorEntry('test-fgb', 'fgb')])).rejects.toThrow(
			'test-load-failure'
		);
		expect(GeojsonCache.has('test-fgb')).toBe(false);
	});

	it('結合データのHTTPエラーを成功として登録しない', async () => {
		const entry = vectorEntry('test-join', 'geojsontile');
		if (entry.type === 'vector') {
			entry.properties.joinDataUrl = 'https://example.test/test-join.json';
		}
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
		await expect(prepareSourceData([entry])).rejects.toThrow('503');
		expect(JoinDataCache.get('test-join')).toBeUndefined();
	});

	it('COGのタイルサイズ・ズームを準備時に確定し、生成時にruntimeへ再アクセスしない', async () => {
		const entry = {
			...vectorEntry('test-cog'),
			type: 'raster',
			format: { type: 'cog', mode: 'tile', url: 'https://example.test/test-cog.tif' },
			style: {
				type: 'tiff',
				visualization: {
					mode: 'single',
					uniformsData: { single: { index: 0, min: 0, max: 1, colorMap: 'hsv' } }
				}
			},
			metaData: { minZoom: 0, maxZoom: 10, tileSize: 256 }
		} as MorivisLayerEntry;
		mocks.getMetadata.mockReturnValue({ tileSize: 512, minZoom: 2, maxZoom: 8 });
		const prepared = await prepareSourceData([entry]);
		mocks.getMetadata.mockReturnValue({ tileSize: 256, minZoom: 0, maxZoom: 20 });
		const sources = createSourcesItems({
			entries: [entry],
			prepared,
			mode: 'preview',
			baseMap: null
		});
		expect(sources['test-cog_source']).toMatchObject({ tileSize: 512, minzoom: 2, maxzoom: 8 });
		expect(mocks.getMetadata).toHaveBeenCalledTimes(1);
	});
	it('古い取得結果で新しいGeoJSONキャッシュを上書きしない', async () => {
		let resolveOld!: (data: FeatureCollection) => void;
		mocks.getGeojson.mockReturnValue(
			new Promise<FeatureCollection>((resolve) => {
				resolveOld = resolve;
			})
		);
		let current = true;
		const preparation = prepareSourceData([vectorEntry('test-race')], {
			isCurrent: () => current
		});
		const latest: FeatureCollection = {
			type: 'FeatureCollection',
			features: [{
				type: 'Feature',
				properties: {},
				geometry: { type: 'Point', coordinates: [1, 2] }
			}]
		};
		current = false;
		GeojsonCache.set('test-race', latest);
		resolveOld({ type: 'FeatureCollection', features: [] });
		await preparation;
		expect(GeojsonCache.get('test-race')).toEqual(latest);
	});

	it('古いTIFFの描画完了は現行画像を破棄せず、未採用のURLだけを破棄する', async () => {
		let resolveImage!: (url: string) => void;
		mocks.loadRasterData.mockReturnValue(
			new Promise<string>((resolve) => {
				resolveImage = resolve;
			})
		);
		const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
		let current = true;
		const entry = {
			id: 'test-raster-race',
			type: 'raster',
			format: { type: 'image', url: 'test-raster' },
			metaData: { bounds: [0, 0, 1, 1] },
			style: {
				type: 'tiff',
				visualization: {
					mode: 'single',
					uniformsData: { single: { index: 0, min: 0, max: 1, colorMap: 'hsv' } }
				}
			}
		} as RasterImageEntry<RasterTiffStyle>;
		const preparation = getRasterTiffImageSource(entry, { isCurrent: () => current });
		current = false;
		resolveImage('blob:test-obsolete-image');
		expect(await preparation).toBeUndefined();
		expect(mocks.imageSet).not.toHaveBeenCalled();
		expect(mocks.revokeOldEntries).not.toHaveBeenCalled();
		expect(revoke).toHaveBeenCalledWith('blob:test-obsolete-image');
	});
	it('時間軸の自動rangeを準備結果に載せ、採用時にだけ実entryへ同期する', async () => {
		const entry = {
			id: 'test-time-range',
			type: 'raster',
			format: { type: 'image', url: 'test-raster' },
			metaData: { bounds: [0, 0, 1, 1] },
			state: { dimension: { currentIndex: 1 } },
			style: {
				type: 'tiff',
				visualization: {
					mode: 'single',
					uniformsData: { single: { index: 0, min: 0, max: 1, colorMap: 'hsv' } }
				}
			}
		} as RasterImageEntry<RasterTiffStyle>;
		const before = structuredClone(entry.style.visualization);
		mocks.hasNetcdf.mockReturnValue(true);
		mocks.getDataRanges.mockReturnValue([{ min: 10, max: 20 }]);
		mocks.loadRasterData.mockResolvedValue('blob:test-time-image');
		const prepared = await prepareSourceData([structuredClone(entry)]);
		const update = prepared[entry.id].rasterVisualizationUpdate;
		expect(update).toBeDefined();
		expect(entry.style.visualization).toEqual(before);
		applyRasterVisualizationUpdates([entry], [update!]);
		expect(entry.style.visualization).toEqual(update!.after);
		const applied = entry.style.visualization;
		applyRasterVisualizationUpdates([entry], [update!]);
		expect(entry.style.visualization).toBe(applied);
	});

	it('準備中に変更された時刻や可視化設定をrangeの適用で上書きしない', () => {
		const entry = {
			id: 'test-time-edit',
			type: 'raster',
			format: { type: 'image', url: 'test-raster' },
			state: { dimension: { currentIndex: 2 } },
			style: {
				type: 'tiff',
				visualization: {
					mode: 'single',
					uniformsData: { single: { index: 0, min: 0, max: 1, colorMap: 'hsv' } }
				}
			}
		} as RasterImageEntry<RasterTiffStyle>;
		const before = structuredClone(entry.style.visualization);
		const after = structuredClone(before);
		after.uniformsData.single.max = 20;
		const update = { entryId: entry.id, currentIndex: 1, before, after };
		applyRasterVisualizationUpdates([entry], [update]);
		expect(entry.style.visualization).toEqual(before);
		entry.state!.dimension!.currentIndex = 1;
		entry.style.visualization.uniformsData.single.max = 50;
		applyRasterVisualizationUpdates([entry], [update]);
		expect(entry.style.visualization.uniformsData.single.max).toBe(50);
	});
});
