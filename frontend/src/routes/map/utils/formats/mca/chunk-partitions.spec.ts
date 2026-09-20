import { Box3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { partitionMcaChunks } from './chunk-partitions';
import { mcaMeshesToGlb } from './glb';
import { type McaMesh, meshMcaRegion } from './mesh';
import { type McaRegion, sectionKey } from './types';

export const testRegion = (count = 8): McaRegion => ({
	sections: new Map(
		Array.from(
			{ length: count },
			(_, i) => [sectionKey(i - 4, -1, 0), { x: i - 4, y: -1, z: 0, blocks: 1 }]
		)
	),
	palette: ['minecraft:air', 'test:solid'],
	chunkCount: count,
	blockCount: count * 4096,
	dataVersions: [6000]
});
const worldFaces = (meshes: McaMesh[]) =>
	meshes.flatMap((mesh) =>
		Array.from(
			{ length: mesh.faceCount },
			(_, face) =>
				JSON.stringify(
					Array.from(mesh.positions.slice(face * 12, face * 12 + 12), (v, i) =>
						v + mesh.origin[i % 3])
				)
		)
	).sort();

describe('MCA chunk partitions', () => {
	it('小さな仕事に分け、担当sectionを重複させず、各境界に参照用の隣接sectionを含める', () => {
		const region = testRegion();
		const parts = partitionMcaChunks(region);
		expect(parts).toHaveLength(8);
		const owners = parts.flatMap((p) => [...p.ownedSections]);
		expect(owners).toHaveLength(region.sections.size);
		expect(new Set(owners).size).toBe(region.sections.size);
		for (const part of parts) {
			for (const key of part.ownedSections) {
				const s = part.region.sections.get(key)!;
				for (const dx of [-1, 1]) {
					const neighbor = sectionKey(s.x + dx, s.y, s.z);
					if (region.sections.has(neighbor)) {
						expect(part.region.sections.has(neighbor)).toBe(true);
					}
				}
			}
		}
	});
	it('分割前後で露出面の座標・面数とGLB全体の配置が一致する', async () => {
		const region = testRegion();
		const original = meshMcaRegion(region);
		const parts = partitionMcaChunks(region).map((p) =>
			meshMcaRegion(p.region, undefined, Infinity, p.ownedSections)
		);
		expect(worldFaces(parts)).toEqual(worldFaces([original]));
		for (const preserve of [true, false]) {
			const loader = new GLTFLoader();
			const expected = new Box3().setFromObject(
				(await loader.parseAsync(mcaMeshesToGlb([original], preserve), '')).scene
			);
			const actual = new Box3().setFromObject(
				(await loader.parseAsync(mcaMeshesToGlb(parts, preserve), '')).scene
			);
			expect(actual.min.toArray()).toEqual(expected.min.toArray());
			expect(actual.max.toArray()).toEqual(expected.max.toArray());
		}
	});
	it('完全に囲まれた担当チャンクは0面として正常終了する', () => {
		const region = testRegion(1);
		region.sections.clear();
		for (let x = -1; x <= 1; x++) {
			for (let y = -1; y <= 1; y++) {
				for (let z = -1; z <= 1; z++) {
					region.sections.set(sectionKey(x, y, z), { x, y, z, blocks: 1 });
				}
			}
		}
		expect(meshMcaRegion(region, undefined, Infinity, new Set(['0,0,0'])).faceCount).toBe(0);
	});
	it('チャンク数が少ない場合は必要な数だけ作る', () => {
		expect(partitionMcaChunks(testRegion(1))).toHaveLength(1);
		expect(partitionMcaChunks(testRegion(0))).toEqual([]);
	});
});
