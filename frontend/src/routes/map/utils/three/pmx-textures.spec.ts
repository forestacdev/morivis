import { disposeMmdModel, type ThreeMmdModel } from '@yohawing/three-mmd-loader/three';
import { MeshToonMaterial } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadPmxModel } from './pmx-loader';

/** テクスチャ付きの三角形と、存在しないスフィアマップを参照する架空の PMX。 */
const createTestPmx = () => {
	const bytes: number[] = [];
	const u8 = (...values: number[]) => bytes.push(...values);
	const i32 = (value: number) => {
		const buffer = new ArrayBuffer(4);
		new DataView(buffer).setInt32(0, value, true);
		u8(...new Uint8Array(buffer));
	};
	const f32 = (...values: number[]) => {
		for (const value of values) {
			const buffer = new ArrayBuffer(4);
			new DataView(buffer).setFloat32(0, value, true);
			u8(...new Uint8Array(buffer));
		}
	};
	const text = (value: string) => {
		const encoded = new TextEncoder().encode(value);
		i32(encoded.length);
		u8(...encoded);
	};
	u8(80, 77, 88, 32);
	f32(2);
	u8(8, 1, 0, 1, 1, 1, 1, 1, 1);
	['test-model', '', '', ''].forEach(text);
	i32(3);
	for (const position of [[0, 0, 0], [1, 0, 0], [0, 1, 0]]) {
		f32(...position, 0, 0, 1, 0, 0);
		u8(0, 0); // BDEF1、ボーン 0
		f32(1);
	}
	i32(3);
	u8(0, 1, 2);
	i32(2);
	text('test-tex\\test-color.tga');
	text('test-sphere\\test-missing.bmp');
	i32(1);
	text('test-material');
	text('');
	f32(1, 1, 1, 1, 0, 0, 0, 1, 0.5, 0.5, 0.5);
	u8(0);
	f32(0, 0, 0, 1, 1);
	u8(0, 1, 1, 0, 255); // diffuse 0、sphere 1、multiply、toon なし
	text('');
	i32(3);
	i32(1);
	text('test-bone');
	text('');
	f32(0, 0, 0);
	u8(255);
	i32(0);
	u8(0, 0);
	f32(0, 1, 0);
	for (let i = 0; i < 4; i++) i32(0); // morph、表示枠、剛体、joint
	return new Uint8Array(bytes);
};

const createTestTexture = () => {
	// 非圧縮 24 bit TGA、1 × 1 の赤いピクセル。
	const bytes = new Uint8Array(21);
	bytes[2] = 2;
	bytes[12] = 1;
	bytes[14] = 1;
	bytes[16] = 24;
	bytes[20] = 255;
	return bytes;
};

const getMaterial = (model: ThreeMmdModel) => {
	const material = Array.isArray(model.mesh.material)
		? model.mesh.material[0]
		: model.mesh.material;
	if (!(material instanceof MeshToonMaterial)) throw new Error('Expected MeshToonMaterial');
	return material;
};

afterEach(() => vi.unstubAllGlobals());

describe('PMX texture loading', () => {
	it('loads an uploaded model with a missing texture and retains the supplied TGA', async () => {
		const modelUrl = 'blob:https://test.invalid/test-model';
		const textureUrl = 'blob:https://test.invalid/test-texture';
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				if (url === modelUrl) return new Response(createTestPmx());
				if (url === textureUrl) return new Response(createTestTexture());
				throw new Error(`Unexpected fetch: ${url}`);
			})
		);
		const { model } = await loadPmxModel(modelUrl, {
			'test-tex/test-color.tga': textureUrl
		});
		try {
			expect(model.mesh.geometry.getAttribute('position').count).toBe(3);
			expect(getMaterial(model).map?.image.data).toEqual(new Uint8Array([255, 0, 0, 255]));
			expect(model.diagnostics.textures).toContainEqual(expect.objectContaining({
				code: 'TEXTURE_RESOLVE_FAILED',
				textureKind: 'sphere',
				path: 'test-sphere\\test-missing.bmp'
			}));
		} finally {
			disposeMmdModel(model);
		}
	});

	it('loads an uploaded model even when no texture files were supplied', async () => {
		const modelUrl = 'blob:https://test.invalid/test-model';
		vi.stubGlobal('fetch', vi.fn(async () => new Response(createTestPmx())));
		const { model } = await loadPmxModel(modelUrl);
		try {
			expect(model.mesh.geometry.getAttribute('position').count).toBe(3);
			expect(getMaterial(model).map).toBeNull();
		} finally {
			disposeMmdModel(model);
		}
	});

	it('preserves relative texture resolution for a model served over HTTP', async () => {
		const fetchMock = vi.fn(async (input: string | URL | Request) => {
			const url = input.toString();
			if (url === 'https://test.invalid/models/test-model.pmx') {
				return new Response(createTestPmx());
			}
			if (url === 'https://test.invalid/models/test-tex/test-color.tga') {
				return new Response(createTestTexture());
			}
			throw new Error(`Unexpected fetch: ${url}`);
		});
		vi.stubGlobal('fetch', fetchMock);
		const { model } = await loadPmxModel('https://test.invalid/models/test-model.pmx');
		try {
			expect(getMaterial(model).map?.image.data).toEqual(new Uint8Array([255, 0, 0, 255]));
			expect(fetchMock).toHaveBeenCalledWith(
				'https://test.invalid/models/test-tex/test-color.tga'
			);
		} finally {
			disposeMmdModel(model);
		}
	});
});
