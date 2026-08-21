import { describe, expect, it } from 'vitest';

import { isLikelyHritFile } from './index';

const createFile = (bytes: Uint8Array, name = 'sample.hrit') =>
	new File([Uint8Array.from(bytes)], name, { type: 'application/octet-stream' });

describe('hrit detector', () => {
	it('BZ2 ヘッダーのファイルを HRIT 候補として判定する', async () => {
		const file = createFile(Uint8Array.from([0x42, 0x5a, 0x68, 0x39]));

		await expect(isLikelyHritFile(file)).resolves.toBe(true);
	});

	it('素の HRIT ヘッダーらしいバイト列を判定できる', async () => {
		const bytes = new Uint8Array(64);
		const view = new DataView(bytes.buffer);
		bytes[3] = 1;
		view.setUint32(4, 32, false);
		bytes[16] = 1;

		await expect(isLikelyHritFile(createFile(bytes))).resolves.toBe(true);
	});

	it('ランダムな短いバイト列は HRIT 判定しない', async () => {
		const file = createFile(Uint8Array.from([0x00, 0x01, 0x02, 0x03]), 'random.bin');

		await expect(isLikelyHritFile(file)).resolves.toBe(false);
	});
});
