import { createTiles3DEntry } from '$routes/map/data/entries/model';
import { B3DMLoader, WGS84_ELLIPSOID } from '3d-tiles-renderer/three';
import {
	BufferAttribute,
	BufferGeometry,
	Group,
	LoadingManager,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	PerspectiveCamera,
	Points,
	PointsMaterial,
	Raycaster,
	Vector2,
	Vector3
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBatchedTile, createMetadataGlb } from './__fixtures__/tiles';
import { createTilesCoordinateFrame, syncTilesCamera, withTilesHeightOffset } from './coordinates';
import { createTilesGltfLoader, prepareGltfResources } from './gltf-loader';
import { createTilesMaterialController } from './materials';
import { resolveTilesIntersection, setTilesFeatureDefinitions } from './three-picking';

afterEach(() => vi.unstubAllGlobals());

const createLoader = () => {
	const manager = new LoadingManager();
	const loader = createTilesGltfLoader(
		manager,
		new DRACOLoader(),
		new KTX2Loader(),
		new AbortController().signal
	);
	manager.addHandler(/\.(gltf|glb)$/i, loader);
	return { manager, loader };
};

const cast = (scene: Group) => {
	scene.updateMatrixWorld(true);
	return new Raycaster(new Vector3(0.2, 0.2, 2), new Vector3(0, 0, -1)).intersectObject(
		scene,
		true
	)[0];
};

describe('3DTilesRendererJSの実ローダーとクリック属性', () => {
	it('GLBの文字列配列属性を読み、形状・色・地物IDを保持する', async () => {
		const { loader } = createLoader();
		const result = await loader.parseAsync(
			createMetadataGlb().buffer,
			'https://example.invalid/'
		);
		const hit = cast(result.scene);
		expect(hit).toBeDefined();
		expect((hit.object as Mesh).geometry.getAttribute('_feature_id_0').getX(0)).toBe(0);
		expect(((hit.object as Mesh).material as MeshStandardMaterial).color.toArray()).toEqual([
			1,
			0,
			0
		]);
		expect(resolveTilesIntersection(hit, 'test-entry')?.properties).toEqual({
			地物ID: 0,
			labels: '["test-a","test-b"]'
		});
	});
	it('b3dmのBatch Tableを実ローダーから属性パネルまで渡す', async () => {
		const { manager } = createLoader();
		const result = await new B3DMLoader(manager).parse(createBatchedTile());
		expect(resolveTilesIntersection(cast(result.scene), 'test-entry')?.properties).toEqual({
			地物ID: 0,
			name: 'test-building',
			height: 12
		});
	});
	it('nullFeatureIdの面で奥の属性へ抜けず、IDなしを返す', () => {
		const geometry = new BufferGeometry();
		geometry.setAttribute(
			'position',
			new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3)
		);
		geometry.setAttribute(
			'_feature_id_0',
			new BufferAttribute(new Uint8Array([255, 255, 255]), 1)
		);
		const mesh = new Mesh(geometry, new MeshBasicMaterial());
		setTilesFeatureDefinitions(mesh, [{
			attribute: 0,
			propertyTable: 0,
			featureCount: 1,
			nullFeatureId: 255
		}]);
		const scene = new Group();
		scene.add(mesh);
		const result = resolveTilesIntersection(cast(scene), 'test-entry');
		expect(result?.properties.地物ID).toBeUndefined();
		expect(result?.properties.属性情報).toContain('地物IDを取得できません');
	});
	it('親ノードの変換を反映した面で属性を取得する', async () => {
		const { manager } = createLoader();
		const result = await new B3DMLoader(manager).parse(createBatchedTile());
		const parent = new Group();
		parent.position.set(5, 6, 7);
		parent.scale.setScalar(2);
		parent.add(result.scene);
		parent.updateMatrixWorld(true);
		const hit = new Raycaster(new Vector3(5.4, 6.4, 12), new Vector3(0, 0, -1)).intersectObject(
			parent,
			true
		)[0];
		expect(resolveTilesIntersection(hit, 'test-entry')?.properties.name).toBe('test-building');
	});
});

describe('地心座標・高さ・LODカメラ', () => {
	it('ENU原点が地心座標原点と一致し、高さ変更が累積しない', () => {
		const center = WGS84_ELLIPSOID.getCartographicToPosition(0.2, 0.3, 20, new Vector3());
		const frame = createTilesCoordinateFrame(center);
		expect(center.clone().applyMatrix4(frame.ecefToLocal).length()).toBeLessThan(1e-7);
		const raised = withTilesHeightOffset(frame.anchor, frame.scale, 12);
		expect((raised.elements[14] - frame.anchor.elements[14]) / frame.scale).toBeCloseTo(12);
		expect(withTilesHeightOffset(frame.anchor, frame.scale, 0).equals(frame.anchor)).toBe(true);
		expect(withTilesHeightOffset(frame.anchor, frame.scale, NaN).equals(frame.anchor)).toBe(
			true
		);
	});
	it('描画行列とLODカメラの投影が一致し、クリックレイがモデルに当たる', () => {
		const source = new PerspectiveCamera(45, 1, 0.1, 1000);
		source.position.set(0, 0, 10);
		source.updateMatrixWorld(true);
		const anchor = new Matrix4().makeTranslation(0.5, 0.5, 0).scale(
			new Vector3(0.01, -0.01, 0.01)
		);
		const mapMatrix = source.projectionMatrix.clone().multiply(source.matrixWorldInverse)
			.multiply(anchor.clone().invert());
		const camera = new PerspectiveCamera();
		syncTilesCamera(camera, mapMatrix, source.projectionMatrix, anchor);
		const actual = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse);
		actual.elements.forEach((value, i) =>
			expect(value).toBeCloseTo(mapMatrix.clone().multiply(anchor).elements[i], 8)
		);
		const ray = new Raycaster();
		ray.setFromCamera(new Vector2(0, 0), camera);
		expect(ray.ray.origin.z).toBeCloseTo(10);
		expect(ray.ray.direction.z).toBeCloseTo(-1);
	});
});

describe('スタイル更新', () => {
	it('色・透過度を累積させず、flat/PBRを切り替えて追加マテリアルを解放する', () => {
		const entry = createTiles3DEntry('test-mesh', 'https://example.invalid/tileset.json');
		if (entry.style.type !== '3d-tiles-mesh') throw new Error('test-style');
		const original = new MeshStandardMaterial({ color: '#ffffff', opacity: 0.5 });
		const mesh = new Mesh(new BufferGeometry(), original);
		const scene = new Group();
		scene.add(mesh);
		const controller = createTilesMaterialController();
		entry.style.opacity = 0.5;
		entry.style.color = '#808080';
		entry.style.lighting = 'flat';
		controller.apply(scene, entry);
		const flat = mesh.material;
		const dispose = vi.spyOn(flat, 'dispose');
		expect(flat).toBeInstanceOf(MeshBasicMaterial);
		expect(flat.opacity).toBe(0.25);
		controller.apply(scene, entry);
		expect(flat.opacity).toBe(0.25);
		entry.style.lighting = 'pbr';
		entry.style.opacity = 1;
		entry.style.color = '#ffffff';
		controller.apply(scene, entry);
		expect(mesh.material).toBe(original);
		expect(original.opacity).toBe(0.5);
		controller.release(scene);
		expect(dispose).toHaveBeenCalledOnce();
	});
	it('3D Tiles点群の点サイズを画面上のピクセル値として更新する', () => {
		const entry = createTiles3DEntry(
			'test-points',
			'https://example.invalid/tileset.json',
			undefined,
			'point-cloud'
		);
		if (entry.style.type !== 'point-cloud') throw new Error('test-style');
		const points = new Points(new BufferGeometry(), new PointsMaterial());
		const scene = new Group();
		scene.add(points);
		entry.style.pointSize = 5;
		createTilesMaterialController().apply(scene, entry);
		expect(points.material.size).toBe(5);
		expect(points.material.sizeAttenuation).toBe(false);
	});
});

it('外部buffer・画像・schemaを同じ読み込み経路で解決し、重複取得しない', async () => {
	const fetch = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
	vi.stubGlobal('fetch', fetch);
	const json = {
		buffers: [{ uri: 'test.bin' }, { uri: 'test.bin' }],
		images: [{ uri: 'test.png' }],
		extensions: { EXT_structural_metadata: { schemaUri: 'test.json' } }
	};
	const urls = new Set<string>();
	await prepareGltfResources(
		json,
		'https://example.invalid/tiles/',
		new AbortController().signal,
		urls
	);
	try {
		expect(fetch).toHaveBeenCalledTimes(3);
		expect(json.buffers[0].uri).toBe(json.buffers[1].uri);
		expect(json.images[0].uri.startsWith('blob:')).toBe(true);
		expect(urls.size).toBe(3);
	} finally {
		urls.forEach((url) => URL.revokeObjectURL(url));
	}
});
