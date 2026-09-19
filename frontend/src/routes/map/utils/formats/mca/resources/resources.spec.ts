import { Box3, DataTexture, Euler, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chunkFixture, regionFixture } from '../__fixtures__/region';
import { mcaFilesToGlb } from '../batch-convert';
import { mcaMeshesToGlb } from '../glb';
import { readMcaRegion } from '../region';
import { compileVariant } from './geometry';
import { meshResourceRegion } from './mesh';
import { matchesCondition, selectVariants } from './models';
import { loadMinecraftResourcePack, MinecraftResourcePack } from './pack';
import { textureAlphaMode } from './texture';
import {
	type AlphaMode,
	type BlockDefinition,
	type BlockModel,
	DIRECTIONS,
	type ModelElement,
	resourcePath
} from './types';

afterEach(() => vi.unstubAllGlobals());

const cube: BlockModel = {
	textures: { all: 'test:block/opaque' },
	elements: [{
		from: [0, 0, 0],
		to: [16, 16, 16],
		faces: Object.fromEntries(
			Object.keys(DIRECTIONS).map((
				direction
			) => [direction, { texture: '#all', cullface: direction }])
		)
	}]
};
const resources = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
	'assets/test/models/block/cube.json': cube,
	'assets/test/models/block/solid.json': { parent: 'test:block/cube' },
	'assets/test/models/block/glass.json': {
		parent: 'test:block/cube',
		textures: { all: 'test:block/glass' }
	},
	'assets/test/blockstates/solid.json': { variants: { '': { model: 'test:block/solid' } } },
	'assets/test/blockstates/glass.json': { variants: { '': { model: 'test:block/glass' } } },
	...extra
});
// 画像内容そのものは描画素材に依存しない。埋め込み位置・アルファ分類を個別に検証する。
const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1]);
const makePack = (files = resources()) => {
	const fetcher = vi.fn(async (url: string | URL | Request) => {
		const path = String(url).replace('/test-pack/', '');
		if (Object.hasOwn(files, path)) return new Response(JSON.stringify(files[path]));
		if (path.endsWith('.png')) return new Response(imageBytes);
		return new Response('', { status: 404 });
	});
	const names = Object.keys(files).filter((path) => path.includes('/blockstates/')).map(
		(path) => {
			const parts = path.split('/');
			return `${parts[1]}:${parts.slice(3).join('/').replace(/\.json$/, '')}`;
		}
	);
	const decoder = async (name: string, blob: Blob) => ({
		name,
		png: new Uint8Array(await blob.arrayBuffer()),
		alphaMode: (name.includes('glass') ? 'BLEND' : 'OPAQUE') as AlphaMode
	});
	return {
		pack: new MinecraftResourcePack(
			{ format: 1, minecraftVersion: 'test-version', blockstates: names },
			'/test-pack/',
			fetcher,
			decoder
		),
		fetcher
	};
};
const regionWith = async (palette: string[], values = [1, ...Array<number>(4095).fill(0)]) =>
	readMcaRegion(regionFixture([{ nbt: chunkFixture({ palette, values }) }]));

const glbJson = (buffer: ArrayBuffer) => {
	const length = new DataView(buffer).getUint32(12, true);
	return JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length)));
};

describe('Minecraft model definitions', () => {
	it('Workerのfetchにグローバルの呼び出し元を保持する', async () => {
		const manifest = {
			format: 1 as const,
			minecraftVersion: 'test-version',
			blockstates: ['test:solid']
		};
		const { fetcher } = makePack();
		vi.stubGlobal(
			'fetch',
			new Proxy(fetcher, {
				apply: (target, receiver, args) => {
					expect(receiver).toBe(globalThis);
					if (String(args[0]).endsWith('manifest.json')) {
						return Promise.resolve(new Response(JSON.stringify(manifest)));
					}
					return Reflect.apply(target, receiver, args);
				}
			})
		);
		const loaded = await loadMinecraftResourcePack('/test-pack/');
		expect(await loaded!.variants('test:solid', {})).toHaveLength(1);
		const direct = new MinecraftResourcePack(
			manifest,
			'/test-pack/',
			undefined,
			async (name, blob) => ({
				name,
				png: new Uint8Array(await blob.arrayBuffer()),
				alphaMode: 'OPAQUE'
			})
		);
		expect(await direct.model('test:block/solid')).toHaveProperty('elements');
		expect(await direct.texture('test:block/opaque')).toHaveProperty('alphaMode', 'OPAQUE');
	});
	it('親モデルの要素と子のテクスチャ参照を解決し、取得を共通化する', async () => {
		const { pack, fetcher } = makePack(resources({
			'assets/test/models/block/child.json': {
				parent: 'test:block/cube',
				textures: { all: '#side', side: 'test:block/glass' }
			}
		}));
		const model = await pack.model('test:block/child');
		const faces = compileVariant({ model: 'test:block/child', definition: model });
		expect(faces).toHaveLength(6);
		expect(faces.every((face) => face.texture === 'test:block/glass')).toBe(true);
		await pack.model('test:block/child');
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
	it('sprite指定・透過フラグ・接頭辞なしの変数参照を解決する', () => {
		const faces = compileVariant({
			model: 'test:sprite',
			definition: {
				...cube,
				textures: {
					all: '#surface',
					surface: { sprite: 'test:block/opaque', force_translucent: true }
				},
				elements: [{ ...cube.elements![0], faces: { up: { texture: 'all' } } }]
			}
		});
		expect(faces[0].texture).toBe('test:block/opaque');
		expect(faces[0].forceTranslucent).toBe(true);
	});
	it('逆向きの寸法で内側の面を作る', () => {
		const faces = compileVariant({
			model: 'test:inside',
			definition: {
				...cube,
				elements: [{
					...cube.elements![0],
					from: [12, 0, 0],
					to: [4, 16, 16],
					faces: { up: { texture: '#all' } }
				}]
			}
		});
		const [a, b, c] = faces[0].positions.map((p) => new Vector3(...p));
		expect(b.sub(a).cross(c.sub(a)).y).toBeLessThan(0);
	});
	it('循環継承・循環テクスチャ・パス逸脱を拒否する', async () => {
		const { pack } = makePack(resources({
			'assets/test/models/a.json': { parent: 'test:b' },
			'assets/test/models/b.json': { parent: 'test:a' }
		}));
		await expect(pack.model('test:a')).rejects.toThrow('循環');
		expect(() =>
			compileVariant({
				model: 'test:a',
				definition: { ...cube, textures: { all: '#other', other: '#all' } }
			})
		).toThrow('循環');
		expect(() => resourcePath('models', 'test:../../private')).toThrow('識別子');
	});
	it('variantsの状態条件とmultipartのAND/OR・接続方向を選択する', () => {
		expect(
			selectVariants({
				variants: {
					'facing=east,half=top': { model: 'test:top' },
					'facing=east,half=bottom': { model: 'test:bottom' }
				}
			}, { facing: 'east', half: 'top' })
		).toEqual([[{ model: 'test:top' }]]);
		const definition: BlockDefinition = {
			multipart: [
				{ apply: { model: 'test:post' } },
				{ when: { north: 'true' }, apply: { model: 'test:arm' } },
				{
					when: {
						OR: [{ east: 'true' }, { AND: [{ south: 'true' }, { west: 'false' }] }]
					},
					apply: { model: 'test:side' }
				}
			]
		};
		expect(selectVariants(definition, { north: 'false', east: 'true' })).toEqual([[{
			model: 'test:post'
		}], [{ model: 'test:side' }]]);
		expect(matchesCondition({ facing: 'north|east' }, { facing: 'east' })).toBe(true);
	});
	it('回転・UVロック・面のUV回転を保持する', () => {
		const model: BlockModel = {
			textures: { all: 'test:block/opaque' },
			elements: [{
				from: [0, 0, 0],
				to: [16, 8, 16],
				faces: { up: { texture: '#all', cullface: 'up' } }
			}]
		};
		const rotated = compileVariant({ model: 'test:slab', definition: model, y: 90 })[0];
		const locked =
			compileVariant({ model: 'test:slab', definition: model, y: 90, uvlock: true })[0];
		expect(rotated.positions.every((p) => p[1] === 0.5)).toBe(true);
		expect(locked.uvs).not.toEqual(rotated.uvs);
		for (let i = 0; i < 4; i++) {
			expect(locked.uvs[i][0]).toBeCloseTo(locked.positions[i][0]);
			expect(locked.uvs[i][1]).toBeCloseTo(locked.positions[i][2]);
		}
		const face = compileVariant({
			model: 'test:face',
			definition: {
				...model,
				elements: [{
					...model.elements![0],
					faces: { up: { texture: '#all', rotation: 90 } }
				}]
			}
		})[0];
		expect(face.uvs[0]).toEqual([0, 1]);
	});
	it('要素の回転で有限の座標・外向きの面を生成する', () => {
		const definition: BlockModel = {
			...cube,
			elements: [{
				...cube.elements![0],
				from: [6, 0, 6],
				to: [10, 16, 10],
				rotation: { origin: [8, 0, 8], axis: 'z', angle: 22.5, rescale: true }
			}]
		};
		const faces = compileVariant({ model: 'test:tilted', definition });
		expect(faces.every((face) => face.positions.flat().every(Number.isFinite))).toBe(true);
		expect(faces.some((face) => face.positions.some((p) => p[0] < 0))).toBe(true);
	});
	it.each(
		[
			{ axis: 'y', angle: 90, rescale: true },
			{ axis: 'x', angle: -75, rescale: false },
			{ x: 30, y: 60, z: 90, rescale: false },
			{ x: 30, y: 60, z: 90, rescale: true }
		] as const
	)('広角・複数軸の回転を正しい順序で適用する: %j', (values) => {
		const rotation: NonNullable<ModelElement['rotation']> = { origin: [4, 4, 4], ...values };
		const angles = 'axis' in values
			? ['x', 'y', 'z'].map((axis) => axis === values.axis ? values.angle : 0)
			: [values.x, values.y, values.z];
		const matrix = new Matrix4().makeRotationFromEuler(
			new Euler(
				angles[0] * Math.PI / 180,
				angles[1] * Math.PI / 180,
				angles[2] * Math.PI / 180,
				'ZYX'
			)
		);
		if (values.rescale) {
			const scale = [0, 1, 2].map((axis) => {
				const basis = new Vector3().setComponent(axis, 1).applyMatrix4(matrix);
				return 1 / Math.max(...basis.toArray().map(Math.abs));
			});
			matrix.scale(new Vector3(...scale));
		}
		const original = compileVariant({ model: 'test:original', definition: cube });
		const actual = compileVariant({
			model: 'test:rotated',
			definition: { ...cube, elements: [{ ...cube.elements![0], rotation }] }
		});
		const origin = new Vector3(4, 4, 4);
		for (let face = 0; face < original.length; face++) {
			for (let corner = 0; corner < 4; corner++) {
				const expected = new Vector3(...original[face].positions[corner])
					.multiplyScalar(16).sub(origin).applyMatrix4(matrix).add(origin).divideScalar(
						16
					);
				actual[face].positions[corner].forEach((value, axis) => {
					expect(value).toBeCloseTo(expected.getComponent(axis));
				});
			}
		}
	});
	it('空の素材一覧は従来表示へ戻し、壊れた一覧・取得失敗は知らせる', async () => {
		const response = (value: unknown) => vi.fn(async () => new Response(JSON.stringify(value)));
		await expect(loadMinecraftResourcePack('/test/', response({ format: 1, blockstates: [] })))
			.resolves.toBeNull();
		await expect(loadMinecraftResourcePack('/test/', response({ format: 2, blockstates: [] })))
			.rejects.toThrow('素材一覧');
		await expect(
			loadMinecraftResourcePack(
				'/test/',
				vi.fn(async () => new Response('', { status: 500 }))
			)
		).rejects.toThrow('500');
	});
});

describe('Minecraft resource mesh / GLB', () => {
	it('画素が不透明でもモデルの透過指定を材質に保持する', async () => {
		const { pack } = makePack(resources({
			'assets/test/models/block/solid.json': {
				parent: 'test:block/cube',
				textures: { all: { sprite: 'test:block/opaque', force_translucent: true } }
			}
		}));
		const mesh = await meshResourceRegion(
			await regionWith(['minecraft:air', 'test:solid']),
			pack
		);
		expect(mesh.groups?.[0].material.alphaMode).toBe('BLEND');
		expect(mesh.groups?.[0].material.texture?.alphaMode).toBe('OPAQUE');
	});
	it('透明な隣接ブロック越しの面を残し、同じガラス同士の境界は消す', async () => {
		const { pack } = makePack();
		const values = [1, 2, ...Array<number>(4094).fill(0)];
		const mixed = await meshResourceRegion(
			await regionWith(['minecraft:air', 'test:solid', 'test:glass'], values),
			pack
		);
		expect(mixed.faceCount).toBe(11);
		expect(mixed.groups?.map((group) => group.material.alphaMode).sort()).toEqual([
			'BLEND',
			'OPAQUE'
		]);
		const glass = await meshResourceRegion(
			await regionWith(['minecraft:air', 'test:glass'], [
				1,
				1,
				...Array<number>(4094).fill(0)
			]),
			pack
		);
		expect(glass.faceCount).toBe(10);
	});
	it('未定義ブロックも残し、ハーフブロックをフォールバックで再現する', async () => {
		const region = await readMcaRegion(
			regionFixture([{
				nbt: chunkFixture({
					palette: ['minecraft:air', {
						name: 'minecraft:stone_slab',
						properties: { type: 'top' }
					}]
				})
			}])
		);
		const { pack } = makePack();
		const mesh = await meshResourceRegion(region, pack);
		expect(mesh.min).toEqual([0, 0.5, 0]);
		expect(mesh.max).toEqual([1, 1, 1]);
		expect(mesh.faceCount).toBe(6);
		await expect(meshResourceRegion(region, pack, undefined, 5)).rejects.toThrow('面数上限');
	});
	it('GLBにUV・材質・共通画像を埋め込み、実ローダーで透過材質を復元する', async () => {
		const { pack } = makePack();
		const mesh = await meshResourceRegion(
			await regionWith(['minecraft:air', 'test:solid', 'test:glass'], [
				1,
				2,
				...Array<number>(4094).fill(0)
			]),
			pack
		);
		const glb = mcaMeshesToGlb([mesh, { ...mesh, origin: [16, 0, 0] }]);
		const json = glbJson(glb);
		expect(json.images).toHaveLength(2);
		expect(json.meshes[0].primitives).toHaveLength(2);
		expect(json.meshes[0].primitives[0].attributes.TEXCOORD_0).toBeTypeOf('number');
		const binaryStart = 28 + new DataView(glb).getUint32(12, true);
		for (const image of json.images) {
			const view = json.bufferViews[image.bufferView];
			expect(view.byteOffset % 4).toBe(0);
			expect(new Uint8Array(glb, binaryStart + view.byteOffset, view.byteLength)).toEqual(
				imageBytes
			);
		}
		// Nodeには画像デコーダーがないため画像ロードだけ差し替え、geometry/materialはGLTFLoaderで復元する。
		const loader = new GLTFLoader().register(() => ({
			name: 'test-images',
			loadTexture: async () => new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
		}));
		const gltf = await loader.parseAsync(glb, '');
		const bounds = new Box3().setFromObject(gltf.scene);
		expect(bounds.min.toArray()).toEqual([0, 0, 0]);
		expect(bounds.max.toArray()).toEqual([18, 1, 1]);
		const objects: Mesh[] = [];
		gltf.scene.traverse((object) => {
			if (object instanceof Mesh) objects.push(object);
		});
		expect(objects).toHaveLength(4);
		expect(objects.some((object) => (object.material as MeshStandardMaterial).transparent))
			.toBe(true);
		for (const object of objects) {
			const material = object.material as MeshStandardMaterial;
			expect(material.userData.morivisMinecraftMaterial).toBe(true);
			expect(material.map).toBeTruthy();
			const positions = object.geometry.getAttribute('position'),
				normals = object.geometry.getAttribute('normal'),
				indices = object.geometry.index!;
			for (let i = 0; i < indices.count; i += 3) {
				const a = new Vector3().fromBufferAttribute(positions, indices.getX(i));
				const b = new Vector3().fromBufferAttribute(positions, indices.getX(i + 1));
				const c = new Vector3().fromBufferAttribute(positions, indices.getX(i + 2));
				const n = new Vector3().fromBufferAttribute(normals, indices.getX(i));
				expect(b.sub(a).cross(c.sub(a)).normalize().dot(n)).toBeCloseTo(1);
			}
		}
	});
	it('複数MCAの入口から状態別モデルを選び、素材一覧と共通画像を一度だけ取得する', async () => {
		const files = resources({
			'assets/test/blockstates/test-step.json': {
				variants: {
					'half=top': { model: 'test:block/top' },
					'half=bottom': { model: 'test:block/bottom' }
				}
			},
			'assets/test/models/block/top.json': {
				...cube,
				elements: [{ ...cube.elements![0], from: [0, 8, 0], to: [16, 16, 16] }]
			},
			'assets/test/models/block/bottom.json': {
				...cube,
				elements: [{ ...cube.elements![0], from: [0, 0, 0], to: [16, 8, 16] }]
			}
		});
		const { fetcher } = makePack(files);
		const fetch = vi.fn(async (url: string | URL | Request) =>
			String(url).endsWith('manifest.json')
				? new Response(JSON.stringify({ format: 1, blockstates: ['test:test-step'] }))
				: fetcher(url)
		);
		vi.stubGlobal('fetch', fetch);
		vi.stubGlobal(
			'createImageBitmap',
			vi.fn(async () => ({ width: 1, height: 1, close: vi.fn() }))
		);
		vi.stubGlobal(
			'OffscreenCanvas',
			class {
				getContext = () => ({
					drawImage: vi.fn(),
					getImageData: () => ({ data: new Uint8ClampedArray([255, 255, 255, 255]) })
				});
			}
		);
		const mca = (x: number, half: string) =>
			new File([
				regionFixture([{
					nbt: chunkFixture({
						x: x * 32,
						palette: ['minecraft:air', { name: 'test:test-step', properties: { half } }]
					})
				}])
			], `r.${x}.0.mca`);
		const result = await mcaFilesToGlb([mca(0, 'top'), mca(1, 'bottom')], {
			resourcePackUrl: '/test-pack/'
		});
		const json = glbJson(result.glb);
		const bounds = json.meshes.map((
			mesh: { primitives: { attributes: { POSITION: number; }; }[]; }
		) => json.accessors[mesh.primitives[0].attributes.POSITION]);
		expect(bounds[0].min).toEqual([0, 0.5, 0]);
		expect(bounds[1].max).toEqual([1, 0.5, 1]);
		expect(json.nodes[1].translation).toEqual([512, 0, 0]);
		expect(json.images).toHaveLength(1);
		expect(fetch.mock.calls.filter(([url]) => String(url).endsWith('manifest.json')))
			.toHaveLength(1);
		expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith('.png'))).toHaveLength(1);
	});
	it('専用描画モデルはHTTPエラーにせずフォールバックする', async () => {
		const { pack, fetcher } = makePack(resources({
			'assets/test/blockstates/test-special.json': {
				variants: { '': { model: 'test:block/special' } }
			},
			'assets/test/models/block/special.json': { parent: 'builtin/entity' }
		}));
		expect(await pack.variants('test:test-special', {})).toBeNull();
		expect(fetcher.mock.calls.some(([url]) => String(url).includes('builtin'))).toBe(false);
	});
	it('PNGのアルファに応じて不透明・切り抜き・半透明を区別する', () => {
		expect(textureAlphaMode(new Uint8ClampedArray([1, 2, 3, 255]))).toBe('OPAQUE');
		expect(textureAlphaMode(new Uint8ClampedArray([1, 2, 3, 0, 1, 2, 3, 255]))).toBe('MASK');
		expect(textureAlphaMode(new Uint8ClampedArray([1, 2, 3, 127]))).toBe('BLEND');
	});
});
