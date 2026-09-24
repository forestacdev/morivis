import { lonLatToPrefectureName } from '$routes/map/api/address';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMountainPoiLink } from './reference-poi-mountain';

vi.mock('$routes/map/api/address', () => ({ lonLatToPrefectureName: vi.fn() }));
const prefectureMock = vi.mocked(lonLatToPrefectureName);

describe('山のYAMAP検索リンク', () => {
	beforeEach(() => {
		prefectureMock.mockReset().mockResolvedValue('test-prefecture');
	});

	it.each([{ natural: 'peak' }, { class: 'peak' }, { subclass: 'volcano' }])(
		'座標から県名を補完して山名と渡す: %j',
		async (classification) => {
			const link = await getMountainPoiLink({
				...classification,
				name: 'test-name',
				'name:ja': 'test-山 & 仮称'
			}, [1, 2]);
			expect(prefectureMock).toHaveBeenCalledWith(1, 2, expect.any(AbortSignal));
			const url = new URL(link!.url);
			expect(url.origin + url.pathname).toBe('https://yamap.com/search/mountains');
			expect(Object.fromEntries(url.searchParams)).toEqual({
				keyword: 'test-山 & 仮称 test-prefecture',
				sort: 'match'
			});
		}
	);

	it('県名の属性があればAPIを呼ばない', async () => {
		const link = await getMountainPoiLink({
			natural: 'peak',
			name: 'test-peak',
			'addr:province': 'test-region'
		}, [1, 2]);
		expect(prefectureMock).not.toHaveBeenCalled();
		expect(new URL(link!.url).searchParams.get('keyword')).toBe('test-peak test-region');
	});

	it.each(['empty', 'error'])('県名が取得できなくても山名で検索する: %s', async (result) => {
		if (result === 'empty') prefectureMock.mockResolvedValue('');
		else prefectureMock.mockRejectedValue(new Error('test-error'));
		const link = await getMountainPoiLink({ natural: 'peak', name: 'test-peak' }, [1, 2]);
		expect(new URL(link!.url).searchParams.get('keyword')).toBe('test-peak');
	});

	it.each([{ natural: 'peak' }, { name: 'test-cafe', subclass: 'cafe' }])(
		'山名がない地点や山以外はAPIを呼ばずリンクも出さない: %j',
		async (properties) => {
			expect(await getMountainPoiLink(properties, [1, 2])).toBeUndefined();
			expect(prefectureMock).not.toHaveBeenCalled();
		}
	);
});
