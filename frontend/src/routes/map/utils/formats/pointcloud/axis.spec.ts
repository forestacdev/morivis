import { describe, expect, it } from 'vitest';

import { getPointCloudBbox, normalizePointCloudUpAxis } from './axis';

describe('point cloud up axis', () => {
	it('Z-up の座標は変更しない', () => {
		const positions = Float32Array.from([10, -3, 8]);

		expect(normalizePointCloudUpAxis(positions, 'z-up')).toBe(positions);
	});

	it('Y-up の座標を右手系を保った Z-up 座標へ変換する', () => {
		const positions = Float32Array.from([10, 8, 3, 16, 5, -4]);

		expect(Array.from(normalizePointCloudUpAxis(positions, 'y-up'))).toEqual([
			10,
			-3,
			8,
			16,
			4,
			5
		]);
	});

	it('Z-up の座標から地図表示用の XY 範囲を求める', () => {
		const positions = Float32Array.from([10, -3, 8, 16, 4, 5]);

		expect(getPointCloudBbox(positions)).toEqual([10, -3, 16, 4]);
	});
});
