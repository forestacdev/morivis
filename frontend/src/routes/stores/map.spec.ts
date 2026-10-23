import type { AnyTiles3DEntry, ThreeModelEntry } from '$routes/map/data/types/model';
import type { Map as MapLibreMap } from '$routes/map/utils/maplibre';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
	const protocol = (name: string) => ({
		protocolName: name,
		request: vi.fn(),
		cancelAllRequests: vi.fn(),
		clearCache: vi.fn()
	});
	return {
		protocols: Object.fromEntries([
			'webgl',
			'cog',
			'geozarr',
			'mbtiles',
			'geojson',
			'esri-feature',
			'ogc-feature',
			'wfs-feature',
			'tile_index',
			'regional-mesh',
			'h3',
			'plane-grid'
		].map(name => [name, protocol(name)])),
		addProtocol: vi.fn(),
		removeProtocol: vi.fn(),
		terminate: vi.fn(),
		clearCog: vi.fn(),
		clearWcs: vi.fn(),
		terminateCog: vi.fn(),
		loadThree: vi.fn(),
		three: {
			dispose: vi.fn(),
			addModel: vi.fn(),
			createLayer: vi.fn(() => ({ id: '3d-model-layer' }))
		},
		threeLoaded: false,
		loadDeck: vi.fn(),
		deck: { setProps: vi.fn(), finalize: vi.fn() },
		clearPointCloud: vi.fn(),
		fetch: vi.fn(),
		tiles: { setEntries: vi.fn(), dispose: vi.fn() },
		voxel: { setSpecs: vi.fn(), dispose: vi.fn() }
	};
});

vi.mock('$routes/map/protocol/raster', () => ({
	demProtocol: () => mocks.protocols.webgl,
	terminateDemWorkerPool: mocks.terminate
}));
vi.mock('$routes/map/protocol/cog', () => ({
	cogProtocol: () => mocks.protocols.cog,
	terminateCogWorkerPool: mocks.terminate
}));
vi.mock('$routes/map/protocol/geozarr', () => ({ geozarrProtocol: () => mocks.protocols.geozarr }));
vi.mock('$routes/map/protocol/mbtiles', () => ({ mbtilesProtocol: () => mocks.protocols.mbtiles }));
vi.mock('$routes/map/protocol/vector/geojson', () => ({
	geojsonProtocol: () => mocks.protocols.geojson,
	terminateGeojsonWorker: mocks.terminate
}));
vi.mock('$routes/map/protocol/vector/esri-feature', () => ({
	esriFeatureProtocol: () => mocks.protocols['esri-feature'],
	terminateEsriFeatureWorker: mocks.terminate
}));
vi.mock('$routes/map/protocol/vector/ogc-feature', () => ({
	ogcFeatureProtocol: () => mocks.protocols['ogc-feature'],
	terminateOgcFeatureWorker: mocks.terminate
}));
vi.mock('$routes/map/protocol/vector/wfs-feature', () => ({
	wfsFeatureProtocol: () => mocks.protocols['wfs-feature'],
	terminateWfsFeatureWorker: mocks.terminate
}));
vi.mock('$routes/map/protocol/vector/tileindex', () => ({
	tileIndexProtocol: () => mocks.protocols.tile_index,
	terminateTileIndexWorker: mocks.terminate
}));
vi.mock('$routes/map/protocol/vector/regional-mesh', () => ({
	regionalMeshProtocol: mocks.protocols['regional-mesh'],
	terminateRegionalMeshWorker: mocks.terminate
}));
vi.mock('$routes/map/protocol/vector/h3', () => ({
	h3Protocol: mocks.protocols.h3,
	terminateH3Worker: mocks.terminate
}));
vi.mock('$routes/map/protocol/vector/plane-grid', () => ({
	planeGridProtocol: mocks.protocols['plane-grid'],
	terminatePlaneGridWorker: mocks.terminate
}));
vi.mock(
	'$routes/map/protocol/vector/local-mvt',
	() => ({ LOCAL_MVT_PROTOCOL: 'test-mvt', requestLocalMvt: vi.fn() })
);
vi.mock(
	'$routes/map/protocol/raster/local-tiles',
	() => ({ LOCAL_RASTER_TILE_PROTOCOL: 'test-raster', requestLocalRasterTile: vi.fn() })
);
vi.mock(
	'$routes/map/utils/contours/runtime',
	() => ({ ensureContourProtocol: vi.fn(), releaseContourProtocol: vi.fn() })
);
vi.mock('$routes/map/utils/formats/geotiff/cog-runtime', () => ({
	clearAllCogViewportImages: mocks.clearCog,
	terminateCogViewportRuntime: mocks.terminateCog
}));
vi.mock(
	'$routes/map/utils/formats/wcs/runtime',
	() => ({ clearAllWcsViewportImages: mocks.clearWcs })
);
vi.mock('$routes/map/utils/formats/netcdf/cache', () => ({ NetCDFDataCache: {} }));
vi.mock('$routes/map/utils/formats/export/model', () => ({
	buildGlbExportFilename: vi.fn(),
	downloadArrayBufferAsGlb: vi.fn(),
	downloadBlobUrlAsGlb: vi.fn()
}));
vi.mock('$routes/map/utils/icon', () => ({
	isGeneratedPoiIconId: () => false,
	resolveMissingStyleImage: vi.fn(),
	warmupGeneratedPoiIconWorker: async () => {}
}));
vi.mock('$routes/map/utils/layers/highlight', () => ({
	ensureHighlightAnimationImages: vi.fn(),
	HighlightLayerRegistry: { clear: vi.fn() },
	isHighlightLayerId: () => false,
	scheduleHighlightAnimationWarmup: vi.fn()
}));
vi.mock(
	'$routes/map/utils/platform/inertial-scroll-zoom',
	() => ({ configureInertialScrollZoom: vi.fn() })
);
vi.mock('$routes/map/utils/platform/map-options', () => ({
	createMapOptions: () => ({}),
	DRAG_PITCH_DEGREES_PER_PIXEL: 1,
	DRAG_ROTATE_DEGREES_PER_PIXEL: 1
}));
vi.mock(
	'$routes/map/utils/platform/request',
	() => ({ fetchWithDevProxy: mocks.fetch, resolveRequestUrl: vi.fn() })
);
vi.mock(
	'$routes/map/utils/platform/url-params',
	() => ({ getMapParams: () => ({}), set3dParams: vi.fn(), setMapParams: vi.fn() })
);
vi.mock(
	'$routes/map/utils/platform/viewport',
	() => ({ checkMobile: () => false, checkPc: () => true })
);
vi.mock('$routes/stores', async () => {
	const { writable } = await import('svelte/store');
	return { isDebugMode: writable(false), selectedHighlightData: writable(null) };
});
vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));
vi.mock('$routes/map/utils/three/lazy-manager', () => ({
	getThreeJsManager: () => mocks.threeLoaded ? mocks.three : undefined,
	loadThreeJsManager: mocks.loadThree,
	syncThreeGroupVisibility: vi.fn()
}));
vi.mock('$routes/map/utils/tiles3d/layer-manager', () => ({
	Tiles3DLayerManager: class {
		setEntries = mocks.tiles.setEntries;
		dispose = mocks.tiles.dispose;
		createLayer = () => ({ id: '3d-tiles-layer', type: 'custom' });
	}
}));
vi.mock('$routes/map/utils/voxel/layer-manager', () => ({
	GeoZarrVoxelLayerManager: class {
		setSpecs = mocks.voxel.setSpecs;
		dispose = mocks.voxel.dispose;
		createLayer = () => ({ id: 'geozarr-voxel-layer', type: 'custom' });
	}
}));
vi.mock('$routes/map/utils/deck/runtime', async () => {
	await mocks.loadDeck();
	return {
		MapboxOverlay: class {
			setProps = mocks.deck.setProps;
			finalize = mocks.deck.finalize;
		},
		clearPointCloudDataCache: mocks.clearPointCloud
	};
});
vi.mock('$routes/map/utils/maplibre', () => ({
	default: {
		addProtocol: mocks.addProtocol,
		removeProtocol: mocks.removeProtocol,
		Map: class {
			_removed = false;
			canvas = new EventTarget();
			handlers = new Map<string, (event: unknown) => void>();
			on = (name: string, callback: (event: unknown) => void) =>
				this.handlers.set(name, callback);
			getCanvas = () => this.canvas;
			getContainer = () => ({ clientWidth: 100, clientHeight: 100 });
			getLayer = vi.fn(() => undefined);
			getStyle = () => ({ layers: [] });
			setStyle = vi.fn();
			setLayoutProperty = vi.fn();
			setMissingStyleImageResolver = vi.fn();
			hasImage = () => false;
			addImage = vi.fn();
			addLayer = vi.fn();
			addControl = vi.fn();
			removeControl = vi.fn((control: { finalize: () => void; }) => control.finalize());
			getTerrain = () => ({});
			terrain = { sourceCache: { sourceCache: { reload: vi.fn() } } };
			remove = vi.fn(() => {
				this._removed = true;
			});
		}
	}
}));

// WebGLを使わず、地図の寿命と非同期処理の境界だけを検証する。
type TestMap = MapLibreMap & {
	handlers: Map<string, (event: unknown) => void>;
	canvas: EventTarget;
};
let store: typeof import('./map').mapStore;
const init = async () => {
	await store.init({} as HTMLElement);
	return store.getMap() as TestMap;
};

beforeEach(async () => {
	vi.resetModules();
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.stubGlobal('window', new EventTarget());
	vi.stubGlobal('document', { documentElement: { classList: { toggle: vi.fn() } } });
	mocks.threeLoaded = false;
	store = (await import('./map')).mapStore;
});
afterEach(() => {
	store?.remove();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('地図ストアの破棄と再初期化', () => {
	it('2D地図の破棄では未使用の3D runtimeを読み込まない', async () => {
		await init();
		store.remove();
		expect(mocks.loadThree).not.toHaveBeenCalled();
		expect(mocks.loadDeck).not.toHaveBeenCalled();
		expect(mocks.tiles.dispose).not.toHaveBeenCalled();
		expect(mocks.voxel.dispose).not.toHaveBeenCalled();
	});

	it('MapLibreが先に破棄されてもストアの資源と参照を解放する', async () => {
		const map = await init();
		mocks.threeLoaded = true;
		map.remove();
		store.remove();
		expect(map.remove).toHaveBeenCalledOnce();
		expect(mocks.three.dispose).toHaveBeenCalledOnce();
		expect(mocks.clearCog).toHaveBeenCalledOnce();
		expect(store.getMap()).toBeNull();
		expect(store.isInitialized()).toBeNull();
	});

	it('登録済みプロトコルと描画資源を解放し、二度破棄しても再解放しない', async () => {
		const map = await init();
		[
			store.ensureDemProtocol,
			store.ensureCogProtocol,
			store.ensureGeoZarrProtocol,
			store.ensureMbtilesProtocol,
			store.ensureGeojsonProtocol,
			store.ensureEsriProtocol,
			store.ensureOgcFeatureProtocol,
			store.ensureWfsFeatureProtocol,
			store.ensureTileIndexProtocol,
			store.ensureRegionalMeshProtocol,
			store.ensureH3Protocol,
			store.ensurePlaneGridProtocol
		].forEach(ensure => ensure());
		mocks.threeLoaded = true;
		await store.setDeckOverlay([false]);
		await store.setTiles3DStyleEntries([{ id: 'test-tiles' } as AnyTiles3DEntry]);
		store.remove();
		store.remove();
		expect(map.remove).toHaveBeenCalledTimes(1);
		expect(store.getMap()).toBeNull();
		expect(store.isInitialized()).toBeNull();
		expect(mocks.three.dispose).toHaveBeenCalledTimes(1);
		expect(mocks.deck.finalize).toHaveBeenCalledTimes(1);
		expect(mocks.tiles.dispose).toHaveBeenCalledTimes(1);
		expect(mocks.tiles.setEntries).toHaveBeenLastCalledWith([]);
		for (const name of Object.keys(mocks.protocols)) {
			expect(mocks.removeProtocol).toHaveBeenCalledWith(name);
		}
		expect(mocks.clearCog).toHaveBeenCalledTimes(1);
		expect(mocks.clearWcs).toHaveBeenCalledTimes(1);
		expect(mocks.terminateCog).toHaveBeenCalledTimes(1);
		await init();
		store.ensureDemProtocol();
		expect(mocks.addProtocol.mock.calls.filter(([name]) => name === 'webgl')).toHaveLength(2);
	});

	it('古いDOMイベント、遅延移動イベント、地形タイマーを再作成した地図へ持ち越さない', async () => {
		const addWindowListener = vi.spyOn(window, 'addEventListener');
		const removeWindowListener = vi.spyOn(window, 'removeEventListener');
		const map = await init();
		const removeCanvasListener = vi.spyOn(map.canvas, 'removeEventListener');
		const moveEnd = vi.fn();
		const unsubscribe = store.onMoveEnd(moveEnd);
		map.handlers.get('moveend')?.({ type: 'moveend' });
		store.terrainReload();
		const nextMap = await init();
		expect(vi.getTimerCount()).toBe(0);
		vi.runAllTimers();
		expect(map.remove).toHaveBeenCalledOnce();
		expect(moveEnd).not.toHaveBeenCalled();
		for (const event of ['mousemove', 'mouseup']) {
			const registered = addWindowListener.mock.calls.find(([name]) => name === event)!;
			expect(removeWindowListener).toHaveBeenCalledWith(event, registered[1]);
		}
		expect(removeCanvasListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
		expect(store.getMap()).toBe(nextMap);
		unsubscribe();
	});

	it('破棄前のクリックを再購読時に再送しない', async () => {
		const map = await init();
		map.handlers.get('click')?.({
			originalEvent: { target: { classList: { contains: () => true } } }
		});
		store.remove();
		const click = vi.fn();
		const unsubscribe = store.onClick(click);
		await init();
		expect(click).not.toHaveBeenCalled();
		unsubscribe();
	});

	it('Three.jsのロード中に離脱・再訪問しても古いモデルを登録しない', async () => {
		let finish!: (value: typeof mocks.three) => void;
		mocks.loadThree.mockReturnValueOnce(
			new Promise(resolve => {
				finish = resolve;
			})
		);
		await init();
		const pending = store.setThreeLayer([{ id: 'test-model' } as ThreeModelEntry]);
		store.remove();
		const nextMap = await init();
		finish(mocks.three);
		await pending;
		expect(mocks.three.addModel).not.toHaveBeenCalled();
		expect(nextMap.addLayer).not.toHaveBeenCalled();
	});

	it('破棄前の画像取得結果を新しい地図に追加せずbitmapを解放する', async () => {
		let finish!: (value: Response) => void;
		mocks.fetch.mockReturnValueOnce(
			new Promise(resolve => {
				finish = resolve;
			})
		);
		const bitmap = { close: vi.fn() };
		vi.stubGlobal('createImageBitmap', async () => bitmap);
		const map = await init();
		const resolveImage = vi.mocked(map.setMissingStyleImageResolver).mock.calls[0][0]!;
		const pending = resolveImage('poi_top');
		const nextMap = await init();
		finish(new Response(new Blob(['test-image'])));
		await pending;
		expect(nextMap.addImage).not.toHaveBeenCalled();
		expect(bitmap.close).toHaveBeenCalledOnce();
	});
});
