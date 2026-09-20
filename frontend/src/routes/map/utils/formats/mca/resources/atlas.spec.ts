import { DataTexture, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { regionFixture } from '../__fixtures__/region';
import { mcaFilesToGlb } from '../batch-convert';
import { mcaMeshesToGlb } from '../glb';
import { mcaToGlb } from '../index';
import type { McaMesh } from '../mesh';
import { waterMaterial } from '../water';
import { atlasMcaMeshes } from './atlas';
import type { ResourceMaterial, ResourceTexture } from './types';

afterEach(() => vi.unstubAllGlobals());
const texture = (id: number, width = 16, height = 16): ResourceTexture => ({
	name: `test:texture/${id}`,
	png: new Uint8Array([id]),
	alphaMode: 'OPAQUE',
	width,
	height
});
const material = (
	id: number,
	alphaMode: ResourceMaterial['alphaMode'] = 'OPAQUE',
	opacity = 1
): ResourceMaterial => ({
	key: `test:material/${id}`,
	texture: texture(id),
	alphaMode,
	opacity
});
const fixture = (materials: ResourceMaterial[]): McaMesh => ({
	positions: new Float32Array(
		materials.flatMap((_, i) => [i, 0, 0, i + 1, 0, 0, i + 1, 1, 0, i, 1, 0])
	),
	normals: new Float32Array(materials.flatMap(() => [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1])),
	colors: new Uint8Array(materials.length * 16).fill(192),
	uvs: new Float32Array(materials.flatMap(() => [0, 0, 1, 0, 1, 1, 0, 1])),
	indices: new Uint32Array(
		materials.flatMap((_, i) => [0, 1, 2, 0, 2, 3].map(vertex => vertex + i * 4))
	),
	groups: materials.map((material, i) => ({ start: i * 6, count: 6, material })),
	faceCount: materials.length,
	origin: [0, 0, 0],
	min: [0, 0, 0],
	max: [materials.length, 1, 0]
});
const glbJson = (buffer: ArrayBuffer) =>
	JSON.parse(new TextDecoder().decode(
		new Uint8Array(buffer, 20, new DataView(buffer).getUint32(12, true))
	));
// Canvas APIのみ置き換える。UV・index再編成・GLB生成・GLTFLoaderは実装を通す。
const imageEnvironment = (textures: ResourceTexture[]) => {
	const sizes = new Map(textures.map(value => [value.png[0], value]));
	const close = vi.fn(), fillRect = vi.fn(), translate = vi.fn();
	const decode = vi.fn(async (blob: Blob) => {
		const id = new Uint8Array(await blob.arrayBuffer())[0];
		const source = sizes.get(id)!;
		return { width: source.width, height: source.height, close };
	});
	const encode = vi.fn(async () => new Blob([new Uint8Array([255])]));
	vi.stubGlobal('createImageBitmap', decode);
	vi.stubGlobal(
		'OffscreenCanvas',
		class {
			getContext = () => ({
				createPattern: () => ({}),
				save: vi.fn(),
				restore: vi.fn(),
				fillRect,
				translate
			});
			convertToBlob = encode;
		}
	);
	return { decode, close, fillRect, translate, encode };
};

describe('Minecraftテクスチャアトラス', () => {
	it('全チャンクで1枚を共有し、材質ごとの面を統合して座標・法線・色を保持する', async () => {
		const a = material(1), b = material(2), c = material(3);
		const env = imageEnvironment([a.texture!, b.texture!, c.texture!]);
		const meshes = [fixture([a, b, c]), fixture([b, a])];
		const positions = meshes.map(mesh => mesh.positions.slice());
		const normals = meshes.map(mesh => mesh.normals.slice());
		const colors = meshes.map(mesh => mesh.colors.slice());
		await atlasMcaMeshes(meshes);
		expect(env.decode).toHaveBeenCalledTimes(3);
		expect(env.close).toHaveBeenCalledTimes(3);
		expect(env.encode).toHaveBeenCalledOnce();
		meshes.forEach((mesh, i) => {
			expect(mesh.groups).toHaveLength(1);
			expect(mesh.groups![0].count).toBe(mesh.indices.length);
			expect(mesh.positions).toEqual(positions[i]);
			expect(mesh.normals).toEqual(normals[i]);
			expect(mesh.colors).toEqual(colors[i]);
		});
		expect(meshes[0].groups![0].material.texture).toBe(meshes[1].groups![0].material.texture);
		const json = glbJson(mcaMeshesToGlb(meshes));
		expect(json.images).toHaveLength(1);
		expect(json.textures).toHaveLength(1);
		expect(json.meshes.map((mesh: { primitives: unknown[]; }) => mesh.primitives.length))
			.toEqual([1, 1]);
		expect(json.samplers).toEqual([{
			magFilter: 9728,
			minFilter: 9728,
			wrapS: 33071,
			wrapT: 33071
		}]);
	});

	it('不透明・切り抜き・半透明・opacityを分け、水の半透明もGLBに残す', async () => {
		const materials = [
			material(1),
			material(2, 'MASK'),
			material(3),
			material(4, 'BLEND'),
			material(5, 'BLEND', 0.4),
			waterMaterial
		];
		imageEnvironment(materials.flatMap(value => value.texture ? [value.texture] : []));
		const mesh = fixture(materials);
		await atlasMcaMeshes([mesh]);
		expect(mesh.groups).toHaveLength(5);
		expect([...mesh.indices.slice(0, 12)]).toEqual([0, 1, 2, 0, 2, 3, 8, 9, 10, 8, 10, 11]);
		expect(mesh.groups!.map(group => group.start)).toEqual([0, 12, 18, 24, 30]);
		const glb = mcaMeshesToGlb([mesh]);
		expect(glbJson(glb).images).toHaveLength(1);
		const loader = new GLTFLoader().register(() => ({
			name: 'test-atlas-images',
			loadTexture: async () => new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
		}));
		const gltf = await loader.parseAsync(glb, '');
		const loaded: MeshStandardMaterial[] = [];
		gltf.scene.traverse(object => {
			if (object instanceof Mesh) loaded.push(object.material as MeshStandardMaterial);
		});
		expect(loaded.filter(value => value.transparent)).toHaveLength(3);
		expect(loaded.some(value => value.alphaTest === 0.1)).toBe(true);
		expect(loaded.some(value => value.opacity === 0.55 && !value.map)).toBe(true);
		expect(loaded.some(value => value.opacity === 0.4 && !!value.map)).toBe(true);
	});

	it('負のUV・繰り返し・反転を保ち、境界に余白を設ける', async () => {
		const source = material(1);
		source.texture = texture(1, 2, 4);
		const env = imageEnvironment([source.texture]);
		const mesh = fixture([source]);
		mesh.uvs = new Float32Array([1.5, 0, -0.5, 0, -0.5, 1, 1.5, 1]);
		await atlasMcaMeshes([mesh]);
		const atlas = mesh.groups![0].material.texture!;
		expect([atlas.width, atlas.height]).toEqual([10, 8]);
		expect(env.fillRect).toHaveBeenCalledWith(-2, -2, 10, 8);
		expect(env.translate).toHaveBeenCalledWith(2, 2);
		const expected = [0.7, 0.25, 0.3, 0.25, 0.3, 0.75, 0.7, 0.75];
		mesh.uvs.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 6));
	});

	it('上限を超える量は複数ページに分け、高解像度の単独画像は元のREPEAT指定を保つ', async () => {
		const materials = [1, 2, 3].map(id => ({
			...material(id),
			texture: texture(id, 1024, 1024)
		}));
		materials.push({ ...material(4), texture: texture(4, 2048, 2048) });
		const env = imageEnvironment(materials.map(value => value.texture));
		const mesh = fixture(materials);
		await atlasMcaMeshes([mesh]);
		expect(env.encode).toHaveBeenCalledTimes(3);
		expect(env.decode).toHaveBeenCalledTimes(3);
		expect(mesh.groups![3].material.texture).toBe(materials[3].texture);
		expect([...mesh.uvs!.slice(24)]).toEqual([0, 0, 1, 0, 1, 1, 0, 1]);
		const json = glbJson(mcaMeshesToGlb([mesh]));
		expect(json.images).toHaveLength(4);
		expect(json.samplers).toContainEqual({
			magFilter: 9728,
			minFilter: 9984,
			wrapS: 10497,
			wrapT: 10497
		});
	});

	it('画像がなければCanvas不要で、アトラス化済みのメッシュは再変換しない', async () => {
		const plain = fixture([waterMaterial]);
		await atlasMcaMeshes([plain]);
		const a = material(1);
		const env = imageEnvironment([a.texture!]);
		const mesh = fixture([a]);
		await atlasMcaMeshes([mesh]);
		const uv = mesh.uvs!.slice();
		await atlasMcaMeshes([mesh]);
		expect(mesh.uvs).toEqual(uv);
		expect(env.encode).toHaveBeenCalledOnce();
	});

	it('描画失敗でも展開した画像を解放し、UVは変更しない', async () => {
		const a = material(1);
		const env = imageEnvironment([a.texture!]);
		const mesh = fixture([a]);
		const uv = mesh.uvs!.slice();
		env.fillRect.mockImplementation(() => {
			throw new Error('test-failure');
		});
		await expect(atlasMcaMeshes([mesh])).rejects.toThrow('test-failure');
		expect(env.close).toHaveBeenCalledOnce();
		expect(mesh.uvs).toEqual(uv);
	});

	it('単体・複数ファイルの本番変換経路で、並列メッシュ結果にもアトラスを適用する', async () => {
		const a = material(1), b = material(2);
		imageEnvironment([a.texture!, b.texture!]);
		const mesher = async () => [fixture([a, b])];
		const single = await mcaToGlb(regionFixture(), {}, undefined, mesher);
		const batch = await mcaFilesToGlb(
			[new File([regionFixture()], 'r.0.0.mca')],
			{},
			undefined,
			mesher
		);
		for (const result of [single, batch]) {
			const json = glbJson(result.glb);
			expect(json.images).toHaveLength(1);
			expect(json.meshes[0].primitives).toHaveLength(1);
		}
	});
});
