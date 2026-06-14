import { describe, expect, it } from 'vitest';
import { getCocoTile, gsiGetElevation, gsiLonLatToAddress } from './gsi';

describe('gsi api', () => {
	it('標高 API をモックレスポンスで読める', async () => {
		const elevation = await gsiGetElevation(139.6917, 35.6895);

		expect(elevation).toBe(123.45);
	});

	it('逆ジオコーダをモックレスポンスで読める', async () => {
		const address = await gsiLonLatToAddress(139.6917, 35.6895);

		expect(address.results.muniCd).toBe('13104');
		expect(address.results.lv01Nm).toBe('西新宿');
	});

	it('cocotile の CSV を配列へ変換できる', async () => {
		const tiles = await getCocoTile(14, 14545, 6454);

		expect(tiles).toEqual(['std', 'pale', 'relief']);
	});
});
