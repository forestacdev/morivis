import { readFileSync } from 'node:fs';
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseVtk } from '.';
import { createVtkModel, disposeVtkModel, vtkScalarColor } from './model';
import { extractVtkSurface } from './surface';
import type { VtkRenderOptions } from './types';

const data = () =>
	parseVtk(
		new Uint8Array(readFileSync(new URL('./__fixtures__/test-volumes.vtu', import.meta.url)))
			.buffer
	);
const models: Group[] = [];
const build = (options: VtkRenderOptions) => {
	const model = createVtkModel(data(), options);
	models.push(model);
	return model;
};
afterEach(() => {
	models.forEach(disposeVtkModel);
	models.length = 0;
	vi.unstubAllGlobals();
});

describe('VTKのスカラー色とGLB', () => {
	it('点属性は元の頂点に、セル属性は外表面の各三角形に対応する', () => {
		const source = data();
		const surface = extractVtkSurface(source);
		for (const scalarId of ['0', '1']) {
			const model = build({ scalarId, upAxis: 'y', unitScale: 1 });
			const colors = (model.children[0] as Mesh).geometry.getAttribute('color');
			for (let i = 0; i < surface.pointIndices.length; i++) {
				const value = source.scalars[Number(scalarId)].values[
					scalarId === '0'
						? surface.pointIndices[i]
						: surface.cellIndices[Math.floor(i / 3)]
				];
				const expected = vtkScalarColor(
					value,
					scalarId === '0' ? 0 : 10,
					scalarId === '0' ? 40 : 20
				);
				expect(colors.getX(i)).toBeCloseTo(expected.r);
				expect(colors.getY(i)).toBeCloseTo(expected.g);
				expect(colors.getZ(i)).toBeCloseTo(expected.b);
			}
		}
	});
	it('色なし・定数・欠損値を扱う', () => {
		const model = build({ scalarId: null, upAxis: 'y', unitScale: 1 });
		expect((model.children[0] as Mesh).geometry.hasAttribute('color')).toBe(false);
		expect(vtkScalarColor(0, 0, 1).getHexString()).toBe('0000ff');
		expect(vtkScalarColor(1, 0, 1).getHexString()).toBe('ff0000');
		expect(vtkScalarColor(NaN, 0, 1).getHexString()).toBe('808080');
		expect(vtkScalarColor(3, 3, 3).toArray().every(Number.isFinite)).toBe(true);
	});
	it('上方向と単位を変換し、大きな原点を頂点配列から分離する', () => {
		const source = data();
		for (let i = 0; i < source.points.length; i += 3) source.points[i] += 100_000_000;
		const model = createVtkModel(source, { scalarId: null, upAxis: 'z', unitScale: 0.01 });
		models.push(model);
		const box = new Box3().setFromObject(model);
		expect(box.min.x).toBeCloseTo(1_000_000);
		const size = box.getSize(new Vector3());
		expect(size.x).toBeCloseTo(0.02);
		expect(size.y).toBeCloseTo(0.04);
		expect(size.z).toBeCloseTo(0.02);
	});
	it('GLB再読み込み後も頂点色・両面材質・軸・寸法・凡例情報が残る', async () => {
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
		const model = build({ scalarId: '1', upAxis: 'z', unitScale: 0.01 });
		const glb = await new GLTFExporter().parseAsync(model, { binary: true });
		const loaded = await new GLTFLoader().parseAsync(glb as ArrayBuffer, '');
		models.push(loaded.scene);
		const meshes: Mesh[] = [];
		loaded.scene.traverse(object => {
			if (object instanceof Mesh) meshes.push(object);
		});
		expect(meshes).toHaveLength(1);
		expect((meshes[0].material as MeshStandardMaterial).vertexColors).toBe(true);
		expect(Array.from(meshes[0].geometry.getAttribute('color').array)).toEqual(
			Array.from((model.children[0] as Mesh).geometry.getAttribute('color').array)
		);
		expect(new Box3().setFromObject(loaded.scene).getSize(new Vector3()).y).toBeCloseTo(0.04);
		expect(loaded.scene.children[0].userData.vtk.scalar).toMatchObject({
			name: 'test-pressure',
			min: 10,
			max: 20
		});
	});
	it('存在しない解析値と不正な単位を拒否する', () => {
		expect(() => build({ scalarId: '99', upAxis: 'y', unitScale: 1 })).toThrow('スカラー');
		expect(() => build({ scalarId: null, upAxis: 'y', unitScale: 0 })).toThrow('単位');
	});
});
