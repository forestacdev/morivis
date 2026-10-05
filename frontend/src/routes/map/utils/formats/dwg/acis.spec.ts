import { describe, expect, it } from 'vitest';
import { readDwgBinary } from './acis';

// 任意座標の三角形。奇数個の面の後でも次の頂点を8byte境界から読めることを検証する。
const binaryFixture = (triangleCount = 1) => {
	const header = new TextEncoder().encode(JSON.stringify({
		dxf: '',
		skippedSolids: [],
		solids: [0, 1].map(index => ({
			layer: `test-part-${index}`,
			color: '#112233',
			entityType: '3DSOLID',
			vertexCount: 3,
			triangleCount
		}))
	}));
	const first = Math.ceil((8 + header.length) / 8) * 8;
	const stride = Math.ceil((72 + triangleCount * 12) / 8) * 8;
	const buffer = new ArrayBuffer(first + stride * 2);
	const bytes = new Uint8Array(buffer);
	bytes.set([0x4d, 0x44, 0x57, 0x31]);
	new DataView(buffer).setUint32(4, header.length, true);
	bytes.set(header, 8);
	for (const index of [0, 1]) {
		const offset = first + stride * index;
		new Float64Array(buffer, offset, 9).set([0, 0, index, 2, 0, index, 0, 3, index]);
		const indices = new Uint32Array(buffer, offset + 72, triangleCount * 3);
		for (let i = 0; i < indices.length; i++) indices[i] = i % 3;
	}
	return bytes;
};

describe('DWGバイナリ中間データ', () => {
	it('奇数面の後も位置がずれず、同じバッファを参照して読み込む', () => {
		const bytes = binaryFixture();
		const { solids } = readDwgBinary(bytes);
		expect([...solids[1].positions]).toEqual([0, 0, 1, 2, 0, 1, 0, 3, 1]);
		expect([...solids[1].indices]).toEqual([0, 1, 2]);
		expect(solids[0].positions.buffer).toBe(bytes.buffer);
		expect(solids[1].indices.buffer).toBe(bytes.buffer);
	});
	it('旧上限を超える面数を座標の重複展開なしで保持する', () => {
		const { solids } = readDwgBinary(binaryFixture(250_001));
		expect(solids[0].indices.length / 3).toBe(250_001);
		expect(solids[0].positions).toHaveLength(9);
	});
	it('途中で切れたデータや不正な頂点番号を拒否する', () => {
		const bytes = binaryFixture();
		expect(() => readDwgBinary(bytes.subarray(0, bytes.length - 1))).toThrow('不正');
		const { solids } = readDwgBinary(bytes);
		solids[0].indices[0] = 3;
		expect(() => readDwgBinary(bytes)).toThrow('不正');
	});
});
