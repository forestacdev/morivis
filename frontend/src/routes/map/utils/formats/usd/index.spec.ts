import * as THREE from 'three';
import { zipSync } from 'three/addons/libs/fflate.module.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TinyUSDZLoaderUtils } from 'tinyusdz/TinyUSDZLoaderUtils.js';

import { parseUsdArrayBuffer, parseUsdFile } from '.';

const usdMocks = vi.hoisted(() => ({
	buildThreeNode: vi.fn()
}));

vi.mock('tinyusdz/TinyUSDZLoader.js', () => ({
	TinyUSDZLoader: class {
		async init() {
			return this;
		}

		parse(
			_binary: Uint8Array,
			_filePath: string,
			onLoad: (scene: {
				getDefaultRootNode: () => object;
				getTexture: () => { textureImageId: number; };
				getImage: () => { uri: string; };
			}) => void
		) {
			onLoad({
				getDefaultRootNode: () => ({}),
				getTexture: () => ({ textureImageId: 1 }),
				getImage: () => ({ uri: '0/texture.jpeg' })
			});
		}
	}
}));

vi.mock('tinyusdz/tinyusdz.js', () => ({
	default: async () => ({})
}));

vi.mock('tinyusdz/tinyusdz.wasm?url', () => ({
	default: 'data:application/wasm;base64,AGFzbQEAAAA='
}));

vi.mock('tinyusdz/TinyUSDZLoaderUtils.js', () => ({
	TinyUSDZLoaderUtils: {
		createDefaultMaterial: () => new THREE.MeshBasicMaterial(),
		getTextureFromUSD: () => Promise.resolve(new THREE.Texture()),
		buildThreeNode: usdMocks.buildThreeNode
	}
}));

const TEXT_ENCODER = new TextEncoder();
const SYNTHETIC_USDA = `#usda 1.0
(
	defaultPrim = "Root"
)

def Xform "Root"
{
	def Mesh "Triangle"
	{
		int[] faceVertexCounts = [3]
		int[] faceVertexIndices = [0, 1, 2]
		point3f[] points = [(0, 0, 0), (2, 0, 0), (0, 3, 0)]
	}
}`;

const toArrayBuffer = (text: string) => {
	const bytes = TEXT_ENCODER.encode(text);
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

const bytesToArrayBuffer = (bytes: Uint8Array) =>
	bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

const createSyntheticObject = () => {
	const object = new THREE.Group();
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		'position',
		new THREE.Float32BufferAttribute([0, 0, 0, 2, 0, 0, 0, 3, 0], 3)
	);
	object.add(new THREE.Mesh(geometry));
	return object;
};

describe('USD parser', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([0, 97, 115, 109]))));
		usdMocks.buildThreeNode.mockReset();
		usdMocks.buildThreeNode.mockImplementation(createSyntheticObject);
	});

	it('ASCII USDA を TinyUSDZ 経由でメッシュへ変換できる', async () => {
		const object = await parseUsdArrayBuffer(toArrayBuffer(SYNTHETIC_USDA));
		const box = new THREE.Box3().setFromObject(object);

		expect(box.min.toArray()).toEqual([0, 0, 0]);
		expect(box.max.toArray()).toEqual([2, 3, 0]);
	});

	it('USDZアーカイブを TinyUSDZ へ渡せる', async () => {
		const archive = bytesToArrayBuffer(
			zipSync({ 'scene.usda': TEXT_ENCODER.encode(SYNTHETIC_USDA) })
		);
		const object = await parseUsdArrayBuffer(archive);

		expect(new THREE.Box3().setFromObject(object).max.toArray()).toEqual([2, 3, 0]);
	});

	it('USDZ内の相対テクスチャパスをアーカイブから解決する', async () => {
		const textureLoader = vi
			.spyOn(THREE.TextureLoader.prototype, 'loadAsync')
			.mockResolvedValue(new THREE.Texture());
		const createObjectUrl = vi.fn(() => 'blob:synthetic-usdz-texture');
		const revokeObjectUrl = vi.fn();
		vi.stubGlobal('URL', {
			createObjectURL: createObjectUrl,
			revokeObjectURL: revokeObjectUrl
		});
		usdMocks.buildThreeNode.mockImplementation((_root, _material, scene) => {
			void TinyUSDZLoaderUtils.getTextureFromUSD(scene, 1);
			return createSyntheticObject();
		});
		const archive = bytesToArrayBuffer(
			zipSync({
				'scene.usdc': TEXT_ENCODER.encode('PXR-USDC synthetic data'),
				'0/texture.jpeg': new Uint8Array([0xff, 0xd8, 0xff])
			})
		);

		await parseUsdArrayBuffer(archive);

		expect(textureLoader).toHaveBeenCalledWith('blob:synthetic-usdz-texture');
		expect(createObjectUrl).toHaveBeenCalled();
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:synthetic-usdz-texture');
	});

	it('バイナリ USD Crate（USDC）を未対応形式として即時拒否しない', async () => {
		const binaryUsd = toArrayBuffer('PXR-USDC mock binary data');

		await expect(parseUsdArrayBuffer(binaryUsd)).resolves.toBeInstanceOf(THREE.Group);
	});

	it('範囲解析用のUSDファイルではテクスチャを読み込まない', async () => {
		const file = new File([SYNTHETIC_USDA], 'synthetic.usda', { type: 'model/vnd.usda' });

		await parseUsdFile(file);

		expect(usdMocks.buildThreeNode).toHaveBeenCalledWith(
			expect.anything(),
			expect.any(THREE.Material),
			expect.anything(),
			{ overrideMaterial: true }
		);
	});
});
