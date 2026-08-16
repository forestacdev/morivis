import { describe, expect, it } from 'vitest';

import { detectUnsupportedDwgReason } from '.';

describe('dwg parser helpers', () => {
	it('ACIS ソリッドを含む DWG を未対応理由つきで判定する', () => {
		const bytes = new TextEncoder().encode('xxxxACIS BinaryFile(yyyy');

		expect(detectUnsupportedDwgReason(bytes)).toContain('ACIS ソリッド');
	});

	it('通常のバイナリ列は未対応理由なしとする', () => {
		expect(detectUnsupportedDwgReason(new Uint8Array([0x41, 0x43, 0x31, 0x30]))).toBeNull();
	});
});
