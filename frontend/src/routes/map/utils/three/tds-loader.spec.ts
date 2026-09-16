import { Box3, Mesh, Vector3 } from 'three';
import { TDSLoader as ThreeTDSLoader } from 'three/addons/loaders/TDSLoader.js';
import { describe, expect, it } from 'vitest';
import { createTestTds, tdsChunk } from './__fixtures__/test-tds';
import { TDSLoader } from './tds-loader';

const expectVector = (actual: Vector3, expected: number[]) => {
	actual.toArray().forEach((value, index) => expect(value).toBeCloseTo(expected[index], 5));
};

describe('TDSLoaderの初期配置', () => {
	it('親の移動・回転・縮尺とmesh matrix・pivotからインスタンスのboundsを復元する', () => {
		const root = new TDSLoader().parse(createTestTds(), '');
		const bounds = new Box3().setFromObject(root);
		expectVector(bounds.min, [-10, 0, 0]);
		expectVector(bounds.max, [32, 10, 5]);
		const first = root.getObjectByName('test-first')!.children[0] as Mesh;
		const second = root.getObjectByName('test-second')!.children[0] as Mesh;
		expect(first.geometry).toBe(second.geometry);
		expectVector(new Box3().setFromObject(first).min, [20, 6, 5]);
		expectVector(new Box3().setFromObject(second).max, [-8, 4, 0]);
	});

	it('pivotを子ノードへ二重適用しない', () => {
		const root = new TDSLoader().parse(createTestTds(), '');
		expectVector(root.getObjectByName('test-child')!.getWorldPosition(new Vector3()), [
			20,
			8,
			17
		]);
	});

	it('KFDATAがない通常の3DSでは既存の配置を維持する', () => {
		const buffer = createTestTds({ keyframes: false });
		const previous = new ThreeTDSLoader().parse(buffer, '');
		const current = new TDSLoader().parse(buffer, '');
		expect(new Box3().setFromObject(current).equals(new Box3().setFromObject(previous))).toBe(
			true
		);
	});

	it('循環した親子関係を拒否する', () => {
		expect(() => new TDSLoader().parse(createTestTds({ cycle: true }), '')).toThrow('親子関係');
	});

	it('途中で切れたチャンクを拒否する', () => {
		const buffer = createTestTds();
		expect(() => new TDSLoader().parse(buffer.slice(0, -1), '')).toThrow('破損');
	});

	it('終端されないノード名を拒否する', () => {
		const buffer = new Uint8Array(
			tdsChunk(0x4d4d, tdsChunk(0xb000, tdsChunk(0xb002, tdsChunk(0xb010, [65, 66]))))
		).buffer;
		expect(() => new TDSLoader().parse(buffer, '')).toThrow('終端');
	});
});
