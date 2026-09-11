import { describe, expect, it } from 'vitest';
import { normalizePointCloudColors } from './colors';

describe('point cloud color normalization', () => {
	it('removes LAS alpha without shifting the following point colors', () => {
		expect([...normalizePointCloudColors(new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255]), 4)])
			.toEqual([255, 0, 0, 0, 0, 255]);
	});
	it('converts normalized floats and 16-bit channels to 8-bit RGB', () => {
		expect([...normalizePointCloudColors(new Float32Array([0, 0.5, 1]), 3)]).toEqual([
			0,
			128,
			255
		]);
		expect([...normalizePointCloudColors(new Uint16Array([0, 32768, 65535]), 3)]).toEqual([
			0,
			128,
			255
		]);
	});
	it('rejects incomplete RGB data', () => {
		expect(() => normalizePointCloudColors(new Uint8Array(5), 3)).toThrow('RGB');
	});
});
