import { Matrix3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import {
	concat,
	encodeRbxl,
	floats,
	inst,
	interleaved,
	parents,
	prop,
	testChunks,
	text,
	u32,
	vectors
} from './__fixtures__/binary-world';
import { testWorld } from './__fixtures__/world';
import { parseRbxl, readBasicRotation } from './binary';
import { robloxWorldToGlb } from './glb';
import { parseRobloxWorld } from './index';

describe('RBXLバイナリ', () => {
	it('PartのNameを読み、巨大なBaseplateだけを除外する', async () => {
		const chunks = testChunks();
		chunks.splice(
			-2,
			0,
			prop(2, 'Name', 0x01, concat(text('Baseplate'), text('Floor'), text('Unused'))),
			prop(2, 'size', 0x0e, vectors([[768, 12, 640], [4, 2, 2], [8, 8, 8]]))
		);
		const world = await parseRbxl(await encodeRbxl(chunks, 'lz4'));
		expect(world.parts).toHaveLength(1);
		expect(world.parts[0].shape).toBe('wedge');
	});
	it('Terrainの共有文字列と複数プロパティを消費し、未対応内容を通知する', async () => {
		const chunks = testChunks();
		chunks.unshift({
			kind: 'SSTR',
			data: concat(
				u32(0),
				u32(2),
				new Uint8Array(16),
				text('test-grid'),
				new Uint8Array(16),
				text('')
			)
		});
		chunks.splice(5, 0, inst(4, 'Terrain', [40, 41]));
		chunks.splice(
			-2,
			0,
			prop(4, 'SmoothGrid', 0x1c, interleaved([0, 1])),
			prop(4, 'PhysicsGrid', 0x01, concat(text(''), text('test-grid')))
		);
		chunks[chunks.length - 2] = parents([7, 11, 4, 1, 20, 30, 40, 41], [
			4,
			4,
			1,
			-1,
			30,
			-1,
			1,
			1
		]);
		const world = await parseRbxl(await encodeRbxl(chunks, 'lz4', 5, 8));
		expect(world.parts).toHaveLength(2);
		expect(world.warnings).toContain('Terrain: 2件');
	});
	it.each(['none', 'lz4', 'zstd', 'zstd-stream'] as const)(
		'%s 圧縮のワールドを読み、Workspaceの表示パーツだけGLBへ渡す',
		async compression => {
			const bytes = await encodeRbxl(testChunks(), compression);
			const world = await parseRobloxWorld(bytes.buffer);
			expect(world.parts).toHaveLength(2);
			const first = world.parts.find(part => part.shape === 'block')!;
			expect(first.position).toEqual([10, 4, -8]);
			expect(first.size).toEqual([2, 4, 6]);
			expect(first.color).toEqual([1, 0, 0]);
			expect(first.rotation).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
			const rotated = world.parts.find(part => part.shape === 'wedge')!;
			expect(rotated.position).toEqual([14, 8, -2]);
			expect(rotated.rotation).toEqual([0, 0, 1, 0, 1, 0, -1, 0, 0]);
			expect(rotated.opacity).toBe(0.5);
			expect(rotated.color).toEqual([0, 128 / 255, 1]);
			expect(world.warnings).toEqual([]);
			const gltf = await new GLTFLoader().parseAsync(robloxWorldToGlb(world), '');
			expect(gltf.scene.children).not.toHaveLength(0);
		}
	);
	it('ヘッダーからXMLも自動判別する', async () => {
		expect(
			(await parseRobloxWorld(new TextEncoder().encode(testWorld).buffer)).parts[0].position
		).toEqual([10, 4, -8]);
	});
	it('24通りの省略回転を右手系の直交行列として復元する', () => {
		const ids = [
			2,
			3,
			5,
			6,
			7,
			9,
			10,
			12,
			13,
			14,
			16,
			17,
			20,
			21,
			23,
			24,
			25,
			27,
			28,
			30,
			31,
			32,
			34,
			35
		];
		const matrices = ids.map(readBasicRotation);
		expect(new Set(matrices.map(matrix => matrix.join(','))).size).toBe(24);
		for (const values of matrices) {
			const m = new Matrix3().fromArray(values);
			expect(m.determinant()).toBe(1);
			expect(m.clone().multiply(m.clone().transpose()).equals(new Matrix3())).toBe(true);
		}
		readBasicRotation(32).forEach((value, i) => {
			expect(value).toBeCloseTo([0, 0, 1, 0, 1, 0, -1, 0, 0][i]);
		});
		expect(() => readBasicRotation(1)).toThrow(/回転ID/);
	});
	it('Color3とFloat64も読み、親Modelのプロパティは位置へ加算しない', async () => {
		const chunks = testChunks().filter(chunk =>
			!['PROP'].includes(chunk.kind)
			|| !new TextDecoder().decode(chunk.data).includes('Transparency')
		);
		const doubles = new Uint8Array(24);
		const view = new DataView(doubles.buffer);
		[0.25, 0.5, 0].forEach((value, i) => view.setFloat64(i * 8, value, true));
		chunks.splice(
			-2,
			0,
			prop(2, 'Color', 0x0c, vectors([[0.25, 0.5, 1], [1, 0, 0], [0, 0, 0]])),
			prop(2, 'Transparency', 0x05, doubles),
			prop(1, 'CFrame', 0xff, new Uint8Array())
		);
		const world = await parseRbxl(await encodeRbxl(chunks));
		const part = world.parts.find(part => part.shape === 'block')!;
		expect(part.position).toEqual([10, 4, -8]);
		expect(part.color).toEqual([0.25, 0.5, 1]);
		expect(part.opacity).toBe(0.75);
	});
	it.each([0, 8, 14, 31, 50, -1])('途中で切れたファイルを拒否する（%s）', async length => {
		const bytes = await encodeRbxl();
		await expect(parseRbxl(bytes.slice(0, length))).rejects.toThrow();
	});
	it('バージョン違いと件数の不一致を拒否する', async () => {
		const bytes = await encodeRbxl();
		bytes[14] = 1;
		await expect(parseRbxl(bytes)).rejects.toThrow(/バージョン/);
		await expect(parseRbxl(await encodeRbxl(testChunks(), 'none', 4, 7))).rejects.toThrow(
			/件数/
		);
	});
	it('親子の閉路や参照先不明を拒否する', async () => {
		for (const parentRefs of [[4, 4, 7, -1, 30, -1], [999, 4, 1, -1, 30, -1]]) {
			const chunks = testChunks().filter(chunk => chunk.kind !== 'PRNT');
			chunks.splice(-1, 0, parents(undefined, parentRefs));
			await expect(parseRbxl(await encodeRbxl(chunks))).rejects.toThrow(/親子/);
		}
	});
	it('表示用の未知の型や不正な数値を黙って省略しない', async () => {
		for (
			const chunk of [
				prop(2, 'size', 0xff, new Uint8Array()),
				prop(2, 'Transparency', 4, floats([NaN, 0, 0]))
			]
		) {
			const chunks = testChunks();
			chunks.splice(-2, 0, chunk);
			await expect(parseRbxl(await encodeRbxl(chunks))).rejects.toThrow();
		}
	});
	it('未知チャンクをスキップでき、終端後の余剰データは拒否する', async () => {
		const chunks = testChunks();
		chunks.splice(0, 0, { kind: 'TEST', data: new Uint8Array([1, 2, 3]) });
		expect((await parseRbxl(await encodeRbxl(chunks))).parts).toHaveLength(2);
		await expect(parseRbxl(concat(await encodeRbxl(), new Uint8Array([0])))).rejects.toThrow(
			/余分/
		);
	});
});
