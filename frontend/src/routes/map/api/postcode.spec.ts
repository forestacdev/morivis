import { describe, expect, it } from 'vitest';
import { getPostcodeInfo, getPostcodeText, searchPostcode } from './postcode';

describe('postcode api', () => {
	it('郵便番号 JSON をモックレスポンスで読める', async () => {
		const info = await getPostcodeInfo('160-0023');

		expect(info?.prefecture).toBe('東京都');
		expect(info?.city).toBe('新宿区');
	});

	it('郵便番号 text を part 指定込みで読める', async () => {
		const prefecture = await getPostcodeText('1600023', 1);
		const full = await getPostcodeText('1600023');

		expect(prefecture).toBe('東京都');
		expect(full).toBe('東京都新宿区西新宿');
	});

	it('郵便番号検索をモックレスポンスで読める', async () => {
		const results = await searchPostcode('西新宿', { per: 5 });

		expect(results).toHaveLength(1);
		expect(results[0]?.suburb).toBe('西新宿');
	});
});
