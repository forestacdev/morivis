import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import initialize from 'occt-import-js';
import { Box3, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createCadModel, disposeCadModel, getCadFormat, readCadFile } from '.';
import { createTestCadResult, createTestIges } from './__fixtures__/records';
import type { CadImporter } from './types';

const require = createRequire(import.meta.url);
let importer: CadImporter;
const models: ReturnType<typeof createCadModel>[] = [];
const build = (...args: Parameters<typeof createCadModel>) => {
	const model = createCadModel(...args);
	models.push(model);
	return model;
};
beforeAll(async () => {
	importer = await initialize({
		wasmBinary: readFileSync(require.resolve('occt-import-js/dist/occt-import-js.wasm')),
		print: () => {},
		printErr: () => {}
	});
});
afterEach(() => {
	models.splice(0).forEach(disposeCadModel);
	vi.unstubAllGlobals();
});

describe('STEP／IGES', () => {
	it.each(['test.STEP', 'test.stp', 'test.IGES', 'test.igs'])('%s の形式を判定する', name => {
		expect(getCadFormat(name)).toBe(/st/i.test(name.split('.').pop()!) ? 'step' : 'iges');
	});
	it('架空のSTEP平面をWASMで読み込みmmからmへ換算する', () => {
		const data = readFileSync(new URL('./__fixtures__/test-surface.step', import.meta.url));
		const result = readCadFile(importer, data, 'test-surface.step');
		const model = build(result, 'y');
		const size = new Box3().setFromObject(model).getSize(new Vector3());
		expect(size.x).toBeCloseTo(0.01, 7);
		expect(size.y).toBeCloseTo(0.02, 7);
		expect(size.z).toBeCloseTo(0, 7);
	});
	it('架空のIGES曲面をWASMで読み込みmmからmへ換算する', () => {
		const result = readCadFile(
			importer,
			new TextEncoder().encode(createTestIges()),
			'test-surface.igs'
		);
		const model = build(result, 'y');
		const size = new Box3().setFromObject(model).getSize(new Vector3());
		expect(size.x).toBeCloseTo(0.01, 7);
		expect(size.y).toBeCloseTo(0.02, 7);
	});
	it('空・不正なファイルを成功扱いにしない', () => {
		expect(() => readCadFile(importer, new Uint8Array(), 'test.step')).toThrow('空');
		expect(() => readCadFile(importer, new TextEncoder().encode('test-invalid'), 'test.step'))
			.toThrow('解析');
		expect(() => readCadFile(importer, new TextEncoder().encode('test-invalid'), 'test.igs'))
			.toThrow('解析');
		expect(() => getCadFormat('test.txt')).toThrow('選択');
	});
	it('部品階層・共有メッシュ・面ごとの色を保持する', () => {
		const model = build(createTestCadResult(), 'y');
		expect(model.children.map(child => child.name)).toEqual(['test-part-a', 'test-part-b']);
		const mesh = model.children[0].children[0] as Mesh;
		const second = model.children[1].children[0] as Mesh;
		expect(mesh.geometry).toBe(second.geometry);
		expect(mesh.geometry.groups).toEqual([
			{ start: 0, count: 3, materialIndex: 0 },
			{ start: 3, count: 3, materialIndex: 1 }
		]);
		expect((mesh.material as MeshStandardMaterial[])[1].color.getHexString()).toBe('ff0000');
		expect((mesh.material as MeshStandardMaterial[])[0].color.r).toBe(0.5);
	});
	it('Z-upをY-upへ変換しても寸法を保持する', () => {
		const model = build(createTestCadResult(), 'z');
		const size = new Box3().setFromObject(model).getSize(new Vector3());
		expect(size.x).toBeCloseTo(2);
		expect(size.y).toBeCloseTo(4);
		expect(size.z).toBeCloseTo(3);
	});
	it('面なしや範囲外インデックスはエラーになる', () => {
		expect(() => createCadModel({ success: true, meshes: [] })).toThrow('面・立体');
		const result = createTestCadResult();
		result.meshes![0].index.array[0] = 99;
		expect(() => createCadModel(result)).toThrow('不正');
	});
	it('GLB再読み込み後も階層・面色・軸と寸法が残る', async () => {
		vi.stubGlobal(
			'FileReader',
			class {
				result: ArrayBuffer | null = null;
				onloadend: (() => void) | null = null;
				readAsArrayBuffer = (blob: Blob) => {
					void blob.arrayBuffer().then(buffer => {
						this.result = buffer;
						this.onloadend?.();
					});
				};
			}
		);
		const model = build(createTestCadResult(), 'z');
		const glb = await new GLTFExporter().parseAsync(model, { binary: true });
		expect(glb).toBeInstanceOf(ArrayBuffer);
		const loaded = await new GLTFLoader().parseAsync(glb as ArrayBuffer, '');
		models.push(loaded.scene);
		expect(loaded.scene.getObjectByName('test-part-a')).toBeTruthy();
		expect(loaded.scene.getObjectByName('test-part-b')).toBeTruthy();
		const size = new Box3().setFromObject(loaded.scene).getSize(new Vector3());
		expect(size.x).toBeCloseTo(2);
		expect(size.y).toBeCloseTo(4);
		expect(size.z).toBeCloseTo(3);
		const colors: string[] = [];
		loaded.scene.traverse(child => {
			if (child instanceof Mesh) {
				colors.push((child.material as MeshStandardMaterial).color.getHexString());
			}
		});
		expect(colors).toContain('ff0000');
	});
});
