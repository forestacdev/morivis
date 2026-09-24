import type { AnyTiles3DEntry } from '$routes/map/data/types/model';
import type { CustomLayerInterface, Map as MapLibreMap } from '$routes/map/utils/maplibre';
import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';
import { ImplicitTilingPlugin } from '3d-tiles-renderer/core/plugins';
import { TilesRenderer } from '3d-tiles-renderer/three';
import {
	AmbientLight,
	DirectionalLight,
	Matrix4,
	PerspectiveCamera,
	Raycaster,
	Scene,
	Sphere,
	SRGBColorSpace,
	Vector2,
	WebGLRenderer
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { createTilesCoordinateFrame, syncTilesCamera, withTilesHeightOffset } from './coordinates';
import { createTilesGltfLoader } from './gltf-loader';
import { createTilesMaterialController } from './materials';
import { fetchRendererResource } from './renderer-fetch';
import { type PickedTiles3DFeature, resolveTilesIntersection } from './three-picking';

export const TILES_3D_LAYER_ID = '3d-tiles-layer';

type TilesRuntime = {
	entry: AnyTiles3DEntry;
	tiles: TilesRenderer;
	camera: PerspectiveCamera;
	scene: Scene;
	frame: ReturnType<typeof createTilesCoordinateFrame> | null;
	materials: ReturnType<typeof createTilesMaterialController>;
	abort: AbortController;
	ready: boolean;
};

/** entryは定義だけを持ち、通信・キャッシュ・Three.jsの実体はここで管理する。 */
export class Tiles3DLayerManager {
	private entries: AnyTiles3DEntry[] = [];
	private runtimes = new Map<string, TilesRuntime>();
	private renderer: WebGLRenderer | null = null;
	private map: MapLibreMap | null = null;
	private draco: DRACOLoader | null = null;
	private ktx: KTX2Loader | null = null;
	private raycaster = new Raycaster();
	private mapMatrix = new Matrix4();
	private projection = new Matrix4();
	private hasCamera = false;

	setEntries = (entries: AnyTiles3DEntry[]) => {
		// Svelteのプロキシや後続のstyle変更で前回値が変わらないように保持する。
		this.entries = entries.map((entry) => ({
			...entry,
			format: { ...entry.format },
			metaData: { ...entry.metaData },
			style: { ...entry.style }
		} as AnyTiles3DEntry));
		if (!this.renderer) return;
		const ids = new Set(entries.map((entry) => entry.id));
		for (const [id, runtime] of this.runtimes) {
			if (
				!ids.has(id)
				|| entries.find((entry) => entry.id === id)?.format.url !== runtime.entry.format.url
			) {
				this.releaseRuntime(runtime);
				this.runtimes.delete(id);
			}
		}
		for (const entry of this.entries) {
			let runtime = this.runtimes.get(entry.id);
			if (!runtime) {
				runtime = this.createRuntime(entry);
				this.runtimes.set(entry.id, runtime);
			}
			runtime.entry = entry;
			runtime.tiles.forEachLoadedModel((scene) => runtime!.materials.apply(scene, entry));
		}
		this.map?.triggerRepaint();
	};

	private createRuntime = (entry: AnyTiles3DEntry): TilesRuntime => {
		const tiles = new TilesRenderer(entry.format.url);
		const camera = new PerspectiveCamera();
		const scene = new Scene();
		const materials = createTilesMaterialController();
		const abort = new AbortController();
		const runtime: TilesRuntime = {
			entry,
			tiles,
			camera,
			scene,
			materials,
			abort,
			frame: null,
			ready: false
		};
		scene.add(new AmbientLight(0xffffff, 2));
		const light = new DirectionalLight(0xffffff, 2);
		light.position.set(1, -1, 2);
		scene.add(light, tiles.group);
		tiles.group.matrixAutoUpdate = false;
		tiles.setCamera(camera);
		tiles.errorTarget = 6;
		tiles.fetchOptions = { signal: abort.signal };
		tiles.registerPlugin({
			name: 'MORIVIS_fetch',
			fetchData: (url: string, options: RequestInit) =>
				fetchRendererResource(url, {
					...options,
					signal: options.signal
						? AbortSignal.any([options.signal, abort.signal])
						: abort.signal
				})
		});
		tiles.registerPlugin(new ImplicitTilingPlugin());
		tiles.manager.addHandler(
			/\.(gltf|glb)$/i,
			createTilesGltfLoader(tiles.manager, this.draco!, this.ktx!, abort.signal)
		);
		tiles.manager.addHandler(/\.drc$/i, this.draco!);
		tiles.addEventListener('load-root-tileset', () => {
			if (abort.signal.aborted) return;
			const sphere = new Sphere();
			if (!tiles.getBoundingSphere(sphere) || sphere.center.length() < 1) {
				this.map?.fire('error', { error: new Error('3D Tilesの地理座標を取得できません') });
				return;
			}
			runtime.frame = createTilesCoordinateFrame(sphere.center);
			tiles.group.matrix.copy(runtime.frame.ecefToLocal);
			tiles.group.updateMatrixWorld(true);
			this.map?.triggerRepaint();
		});
		tiles.addEventListener('load-model', ({ scene: model }) => {
			if (abort.signal.aborted) return;
			materials.apply(model, runtime.entry);
			this.map?.triggerRepaint();
		});
		tiles.addEventListener('dispose-model', ({ scene: model }) => materials.release(model));
		tiles.addEventListener('needs-update', () => {
			if (!abort.signal.aborted) this.map?.triggerRepaint();
		});
		tiles.addEventListener('load-error', ({ error }) => {
			if (!abort.signal.aborted) this.map?.fire('error', { error });
		});
		return runtime;
	};

	private updateCamera = (runtime: TilesRuntime) => {
		if (!runtime.frame || !this.hasCamera) return false;
		const { style, metaData } = runtime.entry;
		const offset = style.type === '3d-tiles-mesh'
			? (style.heightOffset ?? metaData.altitude ?? 0)
			: 0;
		const anchor = withTilesHeightOffset(runtime.frame.anchor, runtime.frame.scale, offset);
		syncTilesCamera(runtime.camera, this.mapMatrix, this.projection, anchor);
		return true;
	};

	createLayer = (): CustomLayerInterface => ({
		id: TILES_3D_LAYER_ID,
		type: 'custom',
		renderingMode: '3d',
		onAdd: (map, gl) => {
			this.map = map;
			this.renderer = new WebGLRenderer({ canvas: map.getCanvas(), context: gl });
			this.renderer.autoClear = false;
			this.renderer.outputColorSpace = SRGBColorSpace;
			this.draco = new DRACOLoader().setDecoderPath(resolveStaticAssetPath('/draco/gltf/'));
			this.ktx = new KTX2Loader().setTranscoderPath(resolveStaticAssetPath('/basis/'))
				.detectSupport(this.renderer);
			this.setEntries(this.entries);
		},
		render: (_gl, args) => {
			if (!this.map || !this.renderer) return;
			this.mapMatrix.fromArray(args.defaultProjectionData.mainMatrix);
			this.projection.fromArray(args.projectionMatrix);
			this.hasCamera = true;
			const canvas = this.map.getCanvas();
			for (const entry of this.entries) {
				const runtime = this.runtimes.get(entry.id);
				if (!runtime || entry.style.visible === false) continue;
				// rootの初回リクエストはカメラ確定前にも必要。
				runtime.tiles.setResolution(runtime.camera, canvas.width, canvas.height);
				runtime.ready = this.updateCamera(runtime);
				runtime.tiles.group.updateMatrixWorld(true);
				runtime.tiles.update();
				if (!runtime.ready) continue;
				this.renderer.resetState();
				this.renderer.render(runtime.scene, runtime.camera);
			}
			this.renderer.resetState();
		},
		onRemove: () => this.releaseRenderer()
	});

	pick = (point: { x: number; y: number; }): PickedTiles3DFeature | null => {
		if (!this.map || !this.hasCamera) return null;
		const canvas = this.map.getCanvas();
		const ndc = new Vector2(
			2 * point.x / canvas.clientWidth - 1,
			1 - 2 * point.y / canvas.clientHeight
		);
		let nearest: { distance: number; feature: PickedTiles3DFeature; } | null = null;
		for (const runtime of this.runtimes.values()) {
			const entry = runtime.entry;
			if (
				entry.style.type !== '3d-tiles-mesh' || entry.style.visible === false
				|| !entry.interaction.clickable || !runtime.ready
			) continue;
			if (!this.updateCamera(runtime)) continue;
			this.raycaster.setFromCamera(ndc, runtime.camera);
			const hit = this.raycaster.intersectObject(runtime.tiles.group, true)[0];
			if (!hit || (nearest && hit.distance >= nearest.distance)) continue;
			const feature = resolveTilesIntersection(hit, entry.id);
			if (feature) nearest = { distance: hit.distance, feature };
		}
		return nearest?.feature ?? null;
	};

	private releaseRuntime = (runtime: TilesRuntime) => {
		runtime.abort.abort();
		runtime.tiles.dispose();
		runtime.materials.dispose();
	};
	private releaseRenderer = () => {
		for (const runtime of this.runtimes.values()) this.releaseRuntime(runtime);
		this.runtimes.clear();
		this.draco?.dispose();
		this.ktx?.dispose();
		this.renderer?.dispose();
		this.draco = null;
		this.ktx = null;
		this.renderer = null;
		this.map = null;
		this.hasCamera = false;
	};
	dispose = () => {
		this.releaseRenderer();
		this.entries = [];
	};
}
