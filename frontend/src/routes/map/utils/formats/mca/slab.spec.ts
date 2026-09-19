import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { mcaToGlb } from '.';
import { chunkFixture, regionFixture } from './__fixtures__/region';
import { type McaMesh, meshMcaRegion } from './mesh';
import { readMcaRegion } from './region';
import { type McaRegion, sectionKey } from './types';

const slab = (type: string, waterlogged = 'false') => ({
	name: 'minecraft:stone_slab',
	properties: { type, waterlogged }
});

describe('MCA slab states', () => {
	it.each([false, true])(
		'上下・二重を区別し、水没状態で形状を増やさない（modern=%s）',
		async (modern) => {
			const region = await readMcaRegion(regionFixture([{
				nbt: chunkFixture({
					modern,
					palette: [
						'minecraft:air',
						slab('bottom'),
						slab('top'),
						slab('double'),
						slab('bottom', 'true')
					],
					values: [1, 2, 3, 4, ...Array<number>(4092).fill(0)]
				})
			}]));
			expect(region.palette).toEqual([
				'minecraft:air',
				...Array<string>(3).fill('minecraft:stone_slab')
			]);
			expect(region.shapes).toEqual(['cube', 'slab-bottom', 'slab-top', 'cube']);
			expect(Array.from((region.sections.get('0,0,0')!.blocks as Uint16Array).slice(0, 4)))
				.toEqual([1, 2, 3, 1]);
		}
	);

	it.each(
		[
			['bottom', 0, 0.5],
			['top', 0.5, 1],
			['double', 0, 1]
		] as const
	)('%sの高さと負のワールド座標をGLBに保持する', async (type, minY, maxY) => {
		const result = await mcaToGlb(
			regionFixture([{
				nbt: chunkFixture({
					x: -32,
					z: -32,
					y: -1,
					palette: ['minecraft:air', slab(type)]
				})
			}]),
			{ region: { x: -1, z: -1 } }
		);
		const gltf = await new GLTFLoader().parseAsync(result.glb, '');
		const bounds = new Box3().setFromObject(gltf.scene);
		expect(bounds.min.toArray()).toEqual([-512, -16 + minY, -512]);
		expect(bounds.max.toArray()).toEqual([-511, -16 + maxY, -511]);
		expect(result.faceCount).toBe(6);
	});

	it.each(['bottom', 'top', 'double'])(
		'単一パレットの%sでも内部の空隙を保持する',
		async (type) => {
			const region = await readMcaRegion(
				regionFixture([{ nbt: chunkFixture({ palette: [slab(type)] }) }])
			);
			expect(typeof region.sections.get('0,0,0')!.blocks).toBe('number');
			const mesh = meshMcaRegion(region);
			expect(mesh.faceCount).toBe(type === 'double' ? 6 : 96);
			expect(mesh.min).toEqual([0, type === 'top' ? 0.5 : 0, 0]);
			expect(mesh.max).toEqual([16, type === 'bottom' ? 15.5 : 16, 16]);
		}
	);
});

// 架空の小さな配置を半ブロックの占有セルに分解し、出力面の欠落・重複を検証する。
type Block = { x: number; y: number; z: number; kind: 'cube' | 'bottom' | 'top'; };
const kinds = ['cube', 'bottom', 'top'] as const;
const makeRegion = (blocks: Block[]): McaRegion => {
	const region: McaRegion = {
		sections: new Map(),
		palette: ['minecraft:air', 'test:solid', 'minecraft:stone_slab', 'minecraft:stone_slab'],
		shapes: ['cube', 'cube', 'slab-bottom', 'slab-top'],
		chunkCount: 1,
		blockCount: blocks.length,
		dataVersions: [2865]
	};
	for (const block of blocks) {
		const [x, y, z] = [block.x, block.y, block.z].map((v) => Math.floor(v / 16));
		const key = sectionKey(x, y, z);
		let section = region.sections.get(key);
		if (!section) {
			section = { x, y, z, blocks: new Uint16Array(4096) };
			region.sections.set(key, section);
		}
		(section.blocks as Uint16Array)[
			(block.y - y * 16) * 256 + (block.z - z * 16) * 16 + block.x - x * 16
		] = kinds.indexOf(block.kind) + 1;
	}
	return region;
};
const surfaceKey = (axis: number, sign: number, plane: number, u: number, v: number) =>
	`${axis},${sign},${plane},${u},${v}`;
const expectedSurface = (blocks: Block[]) => {
	const occupied = new Set<string>();
	for (const { x, y, z, kind } of blocks) {
		if (kind !== 'top') occupied.add([x, y * 2, z].join(','));
		if (kind !== 'bottom') occupied.add([x, y * 2 + 1, z].join(','));
	}
	const faces: string[] = [];
	for (const key of occupied) {
		const p = key.split(',').map(Number);
		for (let axis = 0; axis < 3; axis++) {
			for (const sign of [-1, 1]) {
				const next = [...p];
				next[axis] += sign;
				if (!occupied.has(next.join(','))) {
					faces.push(
						surfaceKey(
							axis,
							sign,
							p[axis] + (sign > 0 ? 1 : 0),
							p[(axis + 1) % 3],
							p[(axis + 2) % 3]
						)
					);
				}
			}
		}
	}
	return faces.sort();
};
const actualSurface = (mesh: McaMesh) => {
	const faces: string[] = [];
	for (let i = 0; i < mesh.faceCount; i++) {
		const normal = Array.from(mesh.normals.slice(i * 12, i * 12 + 3));
		const axis = normal.findIndex((value) => value !== 0);
		const vertices = Array.from(
			{ length: 4 },
			(_, corner) =>
				Array.from(mesh.positions.slice(i * 12 + corner * 3, i * 12 + corner * 3 + 3))
		);
		const a = new Vector3(...vertices[0]);
		const b = new Vector3(...vertices[normal[axis] > 0 ? 1 : 2]);
		const c = new Vector3(...vertices[normal[axis] > 0 ? 2 : 1]);
		expect(b.sub(a).cross(c.sub(a)).normalize().dot(new Vector3(...normal))).toBeCloseTo(1);
		const points = vertices.map((p) =>
			p.map((value, j) => (value + mesh.origin[j]) * (j === 1 ? 2 : 1))
		);
		const u = (axis + 1) % 3;
		const v = (axis + 2) % 3;
		for (
			let x = Math.min(...points.map((p) => p[u]));
			x < Math.max(...points.map((p) => p[u]));
			x++
		) {
			for (
				let y = Math.min(...points.map((p) => p[v]));
				y < Math.max(...points.map((p) => p[v]));
				y++
			) {
				faces.push(surfaceKey(axis, normal[axis], points[0][axis], x, y));
			}
		}
	}
	return faces.sort();
};

describe('MCA slab surface visibility', () => {
	it.each([0, 1, 2])('axis=%iの隣接・セクション境界で全形状の露出面が一致する', (axis) => {
		for (const boundary of [0, 15, -1]) {
			for (const first of kinds) {
				for (const second of kinds) {
					const p = [0, 0, 0];
					p[axis] = boundary;
					const q = [...p];
					q[axis]++;
					const blocks: Block[] = [
						{ x: p[0], y: p[1], z: p[2], kind: first },
						{ x: q[0], y: q[1], z: q[2], kind: second }
					];
					expect(
						actualSurface(meshMcaRegion(makeRegion(blocks))),
						`${axis}/${boundary}/${first}/${second}`
					)
						.toEqual(expectedSurface(blocks));
				}
			}
		}
	});

	it('同じ高さのハーフブロックを面結合し、面数制限も維持する', () => {
		const blocks: Block[] = [0, 1].map((x) => ({ x, y: 0, z: 0, kind: 'bottom' }));
		const region = makeRegion(blocks);
		expect(meshMcaRegion(region).faceCount).toBe(6);
		expect(() => meshMcaRegion(region, undefined, 5)).toThrow('面数上限');
	});
});
