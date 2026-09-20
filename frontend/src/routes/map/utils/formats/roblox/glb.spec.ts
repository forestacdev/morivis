import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { frameXml, partXml, sizeXml, worldXml } from './__fixtures__/world';
import { robloxWorldToGlb } from './glb';
import { parseRbxlx } from './index';

describe('Roblox→GLB', () => {
	it('回転とサイズを保ち、中心と底面を原点へ寄せたGLBを標準ローダーで開ける', async () => {
		const world = parseRbxlx(
			worldXml(partXml(sizeXml() + frameXml(10000, 8, -10000, [0, 0, 1, 0, 1, 0, -1, 0, 0])))
		);
		const { scene } = await new GLTFLoader().parseAsync(robloxWorldToGlb(world), '');
		const bounds = new Box3().setFromObject(scene);
		expect(bounds.getSize(new Vector3()).toArray()).toEqual([6, 4, 2]);
		expect(bounds.min.y).toBe(0);
		expect(bounds.getCenter(new Vector3()).toArray()).toEqual([0, 2, 0]);
	});
	it('同じ透明度のパーツをまとめ、色を線形RGBにし、半透明材質を分ける', async () => {
		const color = '<Color3 name="Color"><R>0.5</R><G>0</G><B>1</B></Color3>';
		const world = parseRbxlx(
			worldXml(
				partXml(color) + partXml(color + frameXml())
					+ partXml('<float name="Transparency">0.5</float>')
			)
		);
		const { scene } = await new GLTFLoader().parseAsync(robloxWorldToGlb(world), '');
		const meshes: Mesh[] = [];
		scene.traverse(object => {
			if (object instanceof Mesh) meshes.push(object);
		});
		expect(meshes).toHaveLength(2);
		const opaque = meshes.find(mesh =>
			!Array.isArray(mesh.material) && !mesh.material.transparent
		)!;
		expect(opaque.geometry.getAttribute('position').count).toBe(72);
		expect(opaque.geometry.getAttribute('color').getX(0)).toBeCloseTo(0.214041, 5);
		expect(
			meshes.some(mesh =>
				!Array.isArray(mesh.material) && mesh.material.opacity === 0.5
				&& mesh.material.transparent
			)
		).toBe(true);
	});
	it.each([0, 2, 3])('球・円柱・くさびの形状%sを書き出す', async token => {
		const world = parseRbxlx(
			worldXml(partXml(sizeXml(2, 4, 6) + `<token name="shape">${token}</token>`))
		);
		const { scene } = await new GLTFLoader().parseAsync(robloxWorldToGlb(world), '');
		const bounds = new Box3().setFromObject(scene);
		const size = bounds.getSize(new Vector3());
		expect(size.x).toBeCloseTo(2);
		expect(size.y).toBeCloseTo(4);
		expect(size.z).toBeCloseTo(6);
	});
});
