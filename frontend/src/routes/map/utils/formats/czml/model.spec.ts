import { buildMercatorModelMatrix } from '$routes/map/utils/three/mercator-model-matrix';
import { applyModelNodeTransforms } from '$routes/map/utils/three/model-node-transforms';
import { resolveObjectURL } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { Matrix4, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCzml } from '.';
import { createCzmlAssetResolver } from './model-assets';
import { createCzmlModelEntry } from './model-entry';
import { czmlModelMatrix } from './model-placement';

const contents = (name: string) =>
	readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');
const document = () => JSON.parse(contents('test-models.czml'));
afterEach(() => vi.unstubAllGlobals());

describe('CZMLモデル', () => {
	it('モデル参照・位置・速度由来の向き・縮尺を時刻ごとに取得する', async () => {
		const result = await parseCzml(contents('test-models.czml'));
		expect(result.models).toHaveLength(1);
		expect(result.models[0].uri).toBe('test-model.gltf');
		expect(result.models[0].frames).toHaveLength(3);
		expect(result.models[0].frames[1].position).toEqual([
			expect.closeTo(2.51),
			expect.closeTo(1.26),
			expect.closeTo(12)
		]);
		expect(result.models[0].frames[1].scale).toBe(2);
		for (const frame of result.models[0].frames) {
			expect(frame.rotation.every(Number.isFinite)).toBe(true);
		}
	});
	it('orientationとscaleだけのサンプル時刻も収集し、非表示区間を除く', async () => {
		const packets = document();
		packets[1].position = { cartographicDegrees: [2.5, 1.25, 10] };
		packets[1].orientation = {
			epoch: '2024-01-02T00:00:00Z',
			unitQuaternion: [0, 0, 0, 0, 1, 5, 0, 0, 1, 0]
		};
		packets[1].model.scale = { epoch: '2024-01-02T00:00:00Z', number: [0, 1, 5, 3] };
		packets[1].model.show = [{
			interval: '2024-01-02T00:00:10Z/2024-01-02T00:00:20Z',
			boolean: false
		}];
		const result = await parseCzml(JSON.stringify(packets));
		expect(result.timestamps).toContain('2024-01-02T00:00:05.000Z');
		expect(result.models[0].frames.map(frame => frame.timeIndex)).toEqual([0, 1]);
		expect(result.models[0].frames[1].scale).toBe(3);
		expect(result.models[0].frames[0].rotation).not.toEqual(
			result.models[0].frames[1].rotation
		);
	});
	it('不正な縮尺をエラーにする', async () => {
		const packets = document();
		packets[1].model.scale = -1;
		await expect(parseCzml(JSON.stringify(packets))).rejects.toThrow('縮尺');
	});
	it('CZMLの相対パスとglTFの相対パスをそれぞれ基準ファイルから解決する', async () => {
		const source = new File(['[]'], 'test/scene.czml');
		const file = new File(['test-content'], 'test/assets/model.gltf');
		const resolver = createCzmlAssetResolver(source, [file], new AbortController().signal);
		const url = resolver.resolve('assets/model.gltf');
		expect(new TextDecoder().decode(await resolver.read(url))).toBe('test-content');
		expect(resolver.resolve('../textures/test.png', url)).toBe(
			'https://czml-local.invalid/test/textures/test.png'
		);
		await expect(resolver.read(resolver.resolve('missing.glb'))).rejects.toThrow(
			'関連ファイルがありません'
		);
		expect(() => resolver.resolve('file:///test.glb')).toThrow('HTTP');
	});
	it('同名ファイルを曖昧に選ばず、中断された読み込みを開始しない', async () => {
		const source = new File(['[]'], 'scene.czml');
		const resolver = createCzmlAssetResolver(source, [
			new File([''], 'a/test.glb'),
			new File([''], 'b/test.glb')
		], new AbortController().signal);
		await expect(resolver.read(resolver.resolve('test.glb'))).rejects.toThrow('同名');
		const controller = new AbortController();
		controller.abort();
		expect(() =>
			createCzmlAssetResolver(source, [], controller.signal).read(
				'https://test.invalid/model.glb'
			)
		).toThrow();
	});
	it('GLB再読み込み後もメッシュと各時刻の位置・非表示が反映される', async () => {
		vi.stubGlobal('fetch', async (input: Request | string) => {
			const url = typeof input === 'string' ? input : input.url;
			if (url.startsWith('data:')) {
				return new Response(Buffer.from(url.split(',')[1], 'base64'));
			}
			if (url.startsWith('blob:')) {
				return new Response(await resolveObjectURL(url)!.arrayBuffer());
			}
			throw new Error(`Unexpected request: ${url}`);
		});
		vi.stubGlobal('ProgressEvent', class extends Event {});
		vi.stubGlobal(
			'FileReader',
			class {
				result: ArrayBuffer | null = null;
				onloadend: (() => void) | null = null;
				readAsArrayBuffer = (blob: Blob) => {
					void blob.arrayBuffer().then(data => {
						this.result = data;
						this.onloadend?.();
					});
				};
			}
		);
		const source = new File([contents('test-models.czml')], 'test-models.czml');
		const file = new File([contents('test-model.gltf')], 'test-model.gltf');
		const parsed = await parseCzml(await source.text());
		const entry = await createCzmlModelEntry(
			parsed,
			source,
			[source, file],
			'test-model',
			new AbortController().signal
		);
		try {
			const glb = await (await fetch(entry.format.url)).arrayBuffer();
			const scene = (await new GLTFLoader().parseAsync(glb, '')).scene;
			const meshes: Mesh[] = [];
			scene.traverse(node => {
				if (node instanceof Mesh) meshes.push(node);
			});
			expect(meshes).toHaveLength(1);
			expect(meshes[0].geometry.getAttribute('position').count).toBe(3);
			applyModelNodeTransforms(scene, entry);
			const node = scene.getObjectByName(entry.properties!.nodeTransforms![0].nodeName)!;
			const firstPosition = new Vector3().setFromMatrixPosition(node.matrix);
			expect(firstPosition.y).toBeCloseTo(10);
			entry.state!.dimension!.currentIndex = 1;
			applyModelNodeTransforms(scene, entry);
			expect(new Vector3().setFromMatrixPosition(node.matrix).x).toBeGreaterThan(
				firstPosition.x
			);
			const world = buildMercatorModelMatrix(entry.style.transform, false).multiply(
				node.matrix
			);
			const origin = new Vector3().setFromMatrixPosition(world);
			expect(origin.x).toBeCloseTo((2.51 + 180) / 360, 10);
			expect(origin.z).toBeCloseTo(
				12 / (40075016.68557849 * Math.cos(1.26 * Math.PI / 180)),
				10
			);
			entry.properties!.nodeTransforms![0].frames[1] = null;
			applyModelNodeTransforms(scene, entry);
			expect(node.visible).toBe(false);
			entry.state!.dimension!.currentIndex = 0;
			applyModelNodeTransforms(scene, entry);
			expect(node.visible).toBe(true);
		} finally {
			URL.revokeObjectURL(entry.format.url);
		}
	});
	it('ENU軸と地図上のEast/Up/South軸を変換し、極域を誤配置しない', () => {
		const frame = {
			timeIndex: 0,
			position: [2.5, 1.25, 0] as [number, number, number],
			rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1],
			scale: 2
		};
		const matrix = new Matrix4().fromArray(czmlModelMatrix(frame, [2.5, 1.25]));
		expect(new Vector3(0, 0, 1).applyMatrix4(matrix).y).toBeCloseTo(2);
		expect(new Vector3(0, 1, 0).applyMatrix4(matrix).z).toBeCloseTo(-2);
		frame.position[1] = 90;
		expect(() => czmlModelMatrix(frame, [2.5, 1.25])).toThrow('表示範囲');
	});
});
