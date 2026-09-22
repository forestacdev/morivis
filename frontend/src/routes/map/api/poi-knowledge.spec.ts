import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { articleMock, imageMock } = vi.hoisted(() => ({ articleMock: vi.fn(), imageMock: vi.fn() }));
vi.mock(
	'./wikipedia',
	() => ({ getWikipediaArticle: articleMock, getImageLicenseInfo: imageMock })
);

describe('POI Wiki情報', () => {
	const fetchMock = vi.fn();
	beforeEach(() => {
		vi.resetModules();
		fetchMock.mockReset();
		articleMock.mockReset().mockResolvedValue(null);
		imageMock.mockReset().mockResolvedValue(null);
		vi.stubGlobal('fetch', fetchMock);
	});
	afterEach(() => vi.unstubAllGlobals());

	it('Wikidataから日本語記事とP18画像を取得し、名前検索しない', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({
				entities: {
					Q12: {
						descriptions: { ja: { value: 'test-description' } },
						sitelinks: {
							jawiki: { title: 'test-place (test-area)' },
							enwiki: { title: 'test-en' }
						},
						claims: { P18: [{ mainsnak: { datavalue: { value: 'test-image.png' } } }] }
					}
				}
			}))
		);
		imageMock.mockResolvedValue({
			isAllowed: true,
			thumbnail: { source: 'https://example.com/test-image.png' }
		});
		const { getPoiKnowledge } = await import('./poi-knowledge');
		const result = await getPoiKnowledge('test-place', 'Q12');
		expect(articleMock).toHaveBeenCalledWith('test-place (test-area)', {
			exactTitle: true,
			language: 'ja'
		});
		expect(imageMock).toHaveBeenCalledWith('test-image.png');
		expect(result.description).toBe('test-description');
		expect(result.wikidataUrl).toBe('https://www.wikidata.org/wiki/Q12');
		expect(result.wikipediaUrl).toBe('https://ja.wikipedia.org/wiki/test-place_(test-area)');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('Wikidataに日本語記事がない場合は英語の記事を使う', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({
				entities: {
					Q12: {
						sitelinks: { enwiki: { title: 'test-en' } }
					}
				}
			}))
		);
		const { getPoiKnowledge } = await import('./poi-knowledge');
		await getPoiKnowledge('test-place', 'Q12');
		expect(articleMock).toHaveBeenCalledWith('test-en', { exactTitle: true, language: 'en' });
	});

	it.each(['test-related', 'test-place'])(
		'名称検索の結果 %s は同名でも候補リンクのみ返す',
		async (title) => {
			fetchMock.mockResolvedValue(
				new Response(JSON.stringify({ query: { search: [{ title }] } }))
			);
			const { getPoiKnowledge } = await import('./poi-knowledge');
			const result = await getPoiKnowledge('test-place');
			const url = new URL(fetchMock.mock.calls[0][0]);
			expect(url.searchParams.get('srsearch')).toBe('"test-place"');
			expect(result).toEqual({
				article: null,
				searchCandidate: { title, url: `https://ja.wikipedia.org/wiki/${title}` }
			});
			expect(articleMock).not.toHaveBeenCalled();
			expect(imageMock).not.toHaveBeenCalled();
		}
	);

	it('検索結果なしでは記事を取得しない', async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ query: { search: [] } })));
		const { getPoiKnowledge } = await import('./poi-knowledge');
		await expect(getPoiKnowledge('test-place')).resolves.toEqual({ article: null });
		expect(articleMock).not.toHaveBeenCalled();
	});

	it('通信失敗をキャッシュせず再試行できる', async () => {
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
		fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ query: { search: [] } })));
		const { getPoiKnowledge } = await import('./poi-knowledge');
		await expect(getPoiKnowledge('test-place')).rejects.toThrow('503');
		await expect(getPoiKnowledge('test-place')).resolves.toEqual({ article: null });
	});
});
