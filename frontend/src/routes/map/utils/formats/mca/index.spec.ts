import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { mcaToGlb } from '.';
import { chunkFixture, nbtFixture, packedStates, regionFixture, tag } from './__fixtures__/region';
import { meshMcaRegion } from './mesh';
import { readNbt } from './nbt';
import { decodeBlockStates, readMcaRegion } from './region';
import type { McaRegion } from './types';

describe('MCA region parser', () => {
	it.each([1, 2, 3])('圧縮方式%iからブロックを取り出す', async (compression) => {
		const region = await readMcaRegion(regionFixture([{ nbt: chunkFixture(), compression }]));
		expect(region.chunkCount).toBe(1);
		expect(region.blockCount).toBe(1);
		expect(region.sections.get('0,0,0')?.blocks).toEqual(
			Uint16Array.from([1, ...Array<number>(4095).fill(0)])
		);
	});

	it('負の座標・高さを維持し、region内の範囲でチャンクを選べる', async () => {
		const buffer = regionFixture([
			{ nbt: chunkFixture({ x: -32, z: -32, y: -4 }), index: 0 },
			{ nbt: chunkFixture({ x: -1, z: -1, y: -4 }), index: 1023 }
		]);
		const region = await readMcaRegion(buffer, { minChunkX: 31, minChunkZ: 31 });
		expect([...region.sections.keys()]).toEqual(['-1,-4,-1']);
		expect(region.chunkCount).toBe(1);
	});

	it.each([false, true])(
		'5bitのパレットをlong境界をまたいで復元する（padding=%s）',
		async (padded) => {
			const palette = [
				'minecraft:air',
				...Array.from({ length: 16 }, (_, i) => `test:block_${i}`)
			];
			const values = Array.from({ length: 4096 }, (_, i) => i % palette.length);
			const region = await readMcaRegion(
				regionFixture([{
					nbt: chunkFixture({
						modern: false,
						version: padded ? 2566 : 1519,
						padded,
						palette,
						values
					})
				}])
			);
			expect(region.sections.get('0,0,0')?.blocks).toEqual(Uint16Array.from(values));
		}
	);

	it('単一パレットとcave_air/void_airを扱う', async () => {
		const region = await readMcaRegion(regionFixture([
			{ nbt: chunkFixture({ palette: ['minecraft:stone'] }), index: 0 },
			{ nbt: chunkFixture({ x: 1, palette: ['minecraft:cave_air'] }), index: 1 },
			{ nbt: chunkFixture({ x: 2, palette: ['minecraft:void_air'] }), index: 2 }
		]));
		expect(region.chunkCount).toBe(3);
		expect(region.blockCount).toBe(4096);
		expect(region.sections.size).toBe(1);
		expect(region.sections.get('0,0,0')?.blocks).toBe(1);
	});

	it('dataがなくパレットに複数種類あるsectionを拒否する', () => {
		expect(() => decodeBlockStates(undefined, [0, 1])).toThrow('状態データ');
	});

	it('パレット範囲外のIDを拒否する', () => {
		const nbt = readNbt(
			nbtFixture({ data: tag(12, packedStates(Array<number>(4096).fill(3), 2)) })
		);
		expect(() => decodeBlockStates(nbt.data, [0, 1])).toThrow('存在しない');
	});

	it('ヘッダーより前を指すoffset・重複sector・不正lengthを拒否する', async () => {
		const offset = regionFixture();
		new DataView(offset).setUint32(0, 257);
		await expect(readMcaRegion(offset)).rejects.toThrow('格納位置');
		const overlap = regionFixture();
		new DataView(overlap).setUint32(4, new DataView(overlap).getUint32(0));
		await expect(readMcaRegion(overlap)).rejects.toThrow('重複');
		const length = regionFixture();
		new DataView(length).setUint32(8192, 4093);
		await expect(readMcaRegion(length)).rejects.toThrow('長さ');
	});

	it.each([new ArrayBuffer(5), new ArrayBuffer(8193)])(
		'途中で切れたファイルを拒否する',
		async (buffer) => {
			await expect(readMcaRegion(buffer)).rejects.toThrow('ファイルサイズ');
		}
	);

	it('ヘッダーと異なる座標のチャンクを拒否する', async () => {
		await expect(readMcaRegion(regionFixture([{ nbt: chunkFixture({ x: 1 }) }]))).rejects
			.toThrow('座標');
	});

	it('別リージョンの座標が混在すると拒否する', async () => {
		await expect(readMcaRegion(regionFixture([
			{ nbt: chunkFixture() },
			{ nbt: chunkFixture({ x: 33 }), index: 1 }
		]))).rejects.toThrow('混在');
	});

	it('entities/poiのMCAに対してregionを選ぶよう案内する', async () => {
		const nbt = nbtFixture({
			DataVersion: tag(3, 2865),
			Entities: tag(9, { type: 10, values: [] })
		});
		await expect(readMcaRegion(regionFixture([{ nbt }]))).rejects.toThrow('regionフォルダー');
	});

	it('1.12以前、LZ4、外部チャンクを明示的に拒否する', async () => {
		await expect(readMcaRegion(regionFixture([{ nbt: chunkFixture({ version: 1343 }) }])))
			.rejects.toThrow('1.13');
		await expect(readMcaRegion(regionFixture([{ nbt: chunkFixture(), compression: 4 }])))
			.rejects.toThrow('LZ4');
		await expect(readMcaRegion(regionFixture([{ nbt: chunkFixture(), compression: 130 }])))
			.rejects.toThrow('.mcc');
	});

	it('不正な範囲と、保存済みチャンクがない範囲を区別する', async () => {
		await expect(readMcaRegion(regionFixture(), { minChunkX: 4, maxChunkX: 2 })).rejects
			.toThrow('範囲');
		await expect(readMcaRegion(regionFixture(), { minChunkX: 0.5 })).rejects.toThrow('整数');
		await expect(readMcaRegion(regionFixture(), { minChunkX: 1 })).rejects.toThrow('保存済み');
	});

	it('空気だけのregionを空モデルとして登録しない', async () => {
		await expect(
			mcaToGlb(regionFixture([{ nbt: chunkFixture({ palette: ['minecraft:air'] }) }]))
		).rejects.toThrow('表示できるブロック');
	});

	it('巨大な展開結果を上限で打ち切る', async () => {
		await expect(readMcaRegion(regionFixture([{ nbt: new Uint8Array(32 * 1024 * 1024 + 1) }])))
			.rejects.toThrow('展開サイズ');
	});
});

describe('MCA surface mesh / GLB', () => {
	it('単体ブロックが正しい寸法・外向き法線を持つGLBになり、実ローダーで開ける', async () => {
		const result = await mcaToGlb(regionFixture());
		expect(result.faceCount).toBe(6);
		const gltf = await new GLTFLoader().parseAsync(result.glb, '');
		const mesh = gltf.scene.children[0] as Mesh;
		expect(mesh.isMesh).toBe(true);
		const bounds = new Box3().setFromObject(gltf.scene);
		expect(bounds.min.toArray()).toEqual([-0.5, 0, -0.5]);
		expect(bounds.max.toArray()).toEqual([0.5, 1, 0.5]);
		const positions = mesh.geometry.getAttribute('position');
		const normals = mesh.geometry.getAttribute('normal');
		const colors = mesh.geometry.getAttribute('color');
		expect(colors.count).toBe(24);
		expect(colors.normalized).toBe(true);
		const indices = mesh.geometry.index!;
		for (let i = 0; i < indices.count; i += 3) {
			const a = new Vector3().fromBufferAttribute(positions, indices.getX(i));
			const b = new Vector3().fromBufferAttribute(positions, indices.getX(i + 1));
			const c = new Vector3().fromBufferAttribute(positions, indices.getX(i + 2));
			const expected = new Vector3().fromBufferAttribute(normals, indices.getX(i));
			expect(b.sub(a).cross(c.sub(a)).normalize().dot(expected)).toBeCloseTo(1);
		}
	});

	it('同じブロックの隣接面をまとめ、内部面は出力しない', async () => {
		const values = [1, 1, ...Array<number>(4094).fill(0)];
		const result = await mcaToGlb(regionFixture([{ nbt: chunkFixture({ values }) }]));
		expect(result.blockCount).toBe(2);
		expect(result.faceCount).toBe(6);
	});

	it('チャンク境界と高さ方向のsection境界をまたいで内部面を除く', async () => {
		const region = await readMcaRegion(regionFixture([
			{ nbt: chunkFixture({ palette: ['minecraft:stone'] }), index: 0 },
			{ nbt: chunkFixture({ x: 1, palette: ['minecraft:stone'] }), index: 1 }
		]));
		expect(meshMcaRegion(region).faceCount).toBe(10);
		region.sections.set('0,1,0', { x: 0, y: 1, z: 0, blocks: 1 });
		expect(meshMcaRegion(region).faceCount).toBe(14);
		region.sections.set('0,0,1', { x: 0, y: 0, z: 1, blocks: 1 });
		expect(meshMcaRegion(region).faceCount).toBe(18);
	});

	it('読み込み範囲の端に断面を作り、ワールド座標の大小による精度損失を避ける', async () => {
		const buffer = regionFixture([
			{ nbt: chunkFixture({ x: 1_000_000, y: -4, palette: ['minecraft:stone'] }), index: 0 },
			{ nbt: chunkFixture({ x: 1_000_001, y: -4, palette: ['minecraft:stone'] }), index: 1 }
		]);
		const region = await readMcaRegion(buffer, { maxChunkX: 0 });
		const mesh = meshMcaRegion(region);
		expect(mesh.faceCount).toBe(6);
		expect(mesh.origin).toEqual([16_000_000, -64, 0]);
		expect(mesh.min).toEqual([0, 0, 0]);
		expect(mesh.max).toEqual([16, 16, 16]);
	});

	it('従来の50万面を超える入力を標準設定で読み込め、軽量設定では停止する', () => {
		const blocks = Uint16Array.from(
			{ length: 4096 },
			(_, i) => (i % 16 + Math.floor(i / 16) % 16 + Math.floor(i / 256)) % 2
		);
		const region: McaRegion = {
			sections: new Map(),
			palette: ['minecraft:air', 'minecraft:stone'],
			chunkCount: 50,
			blockCount: 0,
			dataVersions: [2865]
		};
		for (let x = 0; x < 50; x++) region.sections.set(`${x},0,0`, { x, y: 0, z: 0, blocks });
		expect(() => meshMcaRegion(region, undefined, 500_000)).toThrow('面数上限（500,000面）');
		const mesh = meshMcaRegion(region);
		expect(mesh.faceCount).toBeGreaterThan(500_000);
		for (const array of [mesh.positions, mesh.normals, mesh.colors, mesh.indices]) {
			expect(array.buffer.byteLength).toBe(array.byteLength);
		}
	});
});

describe('NBT bounds', () => {
	it('切れた文字列と不明タグ型を拒否する', () => {
		expect(() => readNbt(Uint8Array.from([10, 0, 5, 0]))).toThrow('途中で切れて');
		expect(() => readNbt(Uint8Array.from([10, 0, 0, 99, 0, 0, 0]))).toThrow('未対応');
	});
	it('負の配列長と末尾の余計なデータを拒否する', () => {
		expect(() => readNbt(Uint8Array.from([10, 0, 0, 7, 0, 0, 255, 255, 255, 255, 0]))).toThrow(
			'長さ'
		);
		expect(() => readNbt(Uint8Array.from([10, 0, 0, 0, 0]))).toThrow('末尾');
	});
});
