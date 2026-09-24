import { Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { minecraftMaterialState } from '../../three/minecraft-material';
import { chunkFixture, regionFixture } from './__fixtures__/region';
import { mcaMeshesToGlb } from './glb';
import { meshMcaRegion } from './mesh';
import { readMcaRegion } from './region';
import { meshResourceRegion } from './resources/mesh';
import { MinecraftResourcePack } from './resources/pack';

const pack = new MinecraftResourcePack({
	format: 1,
	minecraftVersion: 'test-version',
	blockstates: []
}, '/test/');
const makeRegion = (names: string[]) =>
	readMcaRegion(regionFixture([{
		nbt: chunkFixture({
			palette: ['minecraft:air', ...names],
			values: [...names.map((_, i) => i + 1), ...Array<number>(4096 - names.length).fill(0)]
		})
	}]));

describe.each(['legacy', 'resource'] as const)('Minecraft water: %s', (mode) => {
	const mesh = async (names: string[]) => {
		const region = await makeRegion(names);
		return mode === 'legacy' ? meshMcaRegion(region) : meshResourceRegion(region, pack);
	};
	it('水越しの地形を残し、水だけを半透明の材質にする', async () => {
		const result = await mesh(['minecraft:water', 'test:solid']);
		expect(result.faceCount).toBe(11);
		expect(result.groups?.map((g) => [g.material.alphaMode, g.count / 6]).sort()).toEqual([
			['BLEND', 5],
			['OPAQUE', 6]
		]);
		const gltf = await new GLTFLoader().parseAsync(mcaMeshesToGlb([result]), '');
		const materials: MeshStandardMaterial[] = [];
		gltf.scene.traverse((object) => {
			if (object instanceof Mesh) materials.push(object.material as MeshStandardMaterial);
		});
		const water = materials.find((m) => m.transparent)!;
		expect(water.opacity).toBeCloseTo(0.55);
		expect(minecraftMaterialState(water, 1)).toMatchObject({
			sourceOpacity: 0.55,
			transparent: true,
			depthWrite: false
		});
		expect(materials.find((m) => !m.transparent)?.opacity).toBe(1);
	});
	it('水と気泡柱の間に内部面を残さない', async () => {
		const result = await mesh(['minecraft:water', 'minecraft:bubble_column']);
		expect(result.faceCount).toBe(10);
		expect(result.groups).toHaveLength(1);
		expect(result.groups?.[0].material.alphaMode).toBe('BLEND');
	});
	it('溶岩は不透明のまま扱う', async () => {
		const result = await mesh(['minecraft:lava']);
		expect(result.groups?.some((g) => g.material.alphaMode === 'BLEND') ?? false).toBe(false);
	});
});
