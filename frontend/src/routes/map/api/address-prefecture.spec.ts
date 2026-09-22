import { describe, expect, it, vi } from 'vitest';
import { lonLatToPrefectureName } from './address';
import { gsiLonLatToAddress } from './gsi';

vi.mock('./gsi', () => ({ gsiLonLatToAddress: vi.fn() }));
vi.mock('./muni', () => ({
	GSI: { MUNI_ARRAY: { '9999': '9,test-prefecture,9999,test-city' } }
}));

describe('逆ジオコーダから都道府県名を取得', () => {
	it('先頭ゼロ付き市区町村コードを変換表のキーに合わせる', async () => {
		vi.mocked(gsiLonLatToAddress).mockResolvedValue({
			results: { muniCd: '09999', lv01Nm: 'test-area' }
		});
		expect(await lonLatToPrefectureName(1, 2)).toBe('test-prefecture');
	});

	it.each(['', '99998', 'test-invalid'])(
		'未取得・未知のコードは県名を推測しない: %s',
		async (muniCd) => {
			vi.mocked(gsiLonLatToAddress).mockResolvedValue({ results: { muniCd, lv01Nm: '' } });
			expect(await lonLatToPrefectureName(1, 2)).toBe('');
		}
	);
});
