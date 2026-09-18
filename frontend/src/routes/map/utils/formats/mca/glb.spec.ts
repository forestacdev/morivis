import { describe, expect, it } from 'vitest';
import { regionFixture } from './__fixtures__/region';
import { mcaMeshesToGlb } from './glb';
import { meshMcaRegion } from './mesh';
import { readMcaRegion } from './region';

describe('MCA GLBのサイズ', () => {
	it('uint32を超える全長をヘッダーへ切り詰めず、出力の確保前に止める', async () => {
		const mesh = meshMcaRegion(await readMcaRegion(regionFixture()));
		// 巨大な実メモリを確保せず、出力サイズ計算だけを境界値で検証する。
		Object.defineProperty(mesh.positions, 'byteLength', { value: 0xfffffff0 });
		expect(() => mcaMeshesToGlb([mesh])).toThrow('GLBの4 GiB');
	});
});
