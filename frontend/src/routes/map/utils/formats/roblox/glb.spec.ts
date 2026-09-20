import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { buildMercatorModelMatrix } from '../../three/mercator-model-matrix';
import { getModelBaseRotationX } from '../../three/model-axis';
import { frameXml, partXml, sizeXml, worldXml } from './__fixtures__/world';
import { robloxWorldToGlb } from './glb';
import { parseRbxlx } from './index';

describe('Roblox→GLB', () => {
	it('地図上でRobloxの-Zを南、+Xを西、+Yを上へ向ける', async () => {
		const world = parseRbxlx(worldXml(partXml(sizeXml() + frameXml())));
		const { scene } = await new GLTFLoader().parseAsync(robloxWorldToGlb(world), '');
		scene.updateMatrixWorld(true);
		const modelMatrix = scene.children[0].matrixWorld;
		// 水平回転なので鏡像にはせず、法線や面の表裏も維持する。
		expect(modelMatrix.determinant()).toBeCloseTo(1);
		const mapMatrix = buildMercatorModelMatrix({
			lng: 0,
			lat: 0,
			altitude: 0,
			scale: 1,
			baseRotationX: getModelBaseRotationX('gltf'),
			rotationX: 0,
			rotationY: 0,
			rotationZ: 0
		}, false).multiply(modelMatrix);
		// Mercator座標の+Yは南、+Zは上。
		for (
			const [source, expected] of [
				[[0, 0, -1], [0, 1, 0]],
				[[1, 0, 0], [-1, 0, 0]],
				[[0, 1, 0], [0, 0, 1]]
			]
		) {
			const direction = new Vector3().fromArray(source).transformDirection(mapMatrix);
			expect(direction.distanceTo(new Vector3().fromArray(expected))).toBeLessThan(1e-10);
		}
	});
	it('除外したBaseplateをモデルの範囲や接地高さへ含めない', async () => {
		const world = parseRbxlx(worldXml(
			partXml(
				'<string name="Name">Baseplate</string>' + sizeXml(768, 12, 640)
					+ frameXml(0, -6, 0)
			)
				+ partXml(sizeXml(20, 8, 16) + frameXml(30, 4, -24))
		));
		const { scene } = await new GLTFLoader().parseAsync(robloxWorldToGlb(world), '');
		const bounds = new Box3().setFromObject(scene);
		expect(bounds.getSize(new Vector3()).toArray()).toEqual([20, 8, 16]);
		expect(bounds.min.y).toBe(0);
	});
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
