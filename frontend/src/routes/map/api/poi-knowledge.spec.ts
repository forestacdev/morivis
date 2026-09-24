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

	it('ロゴはP154から取得し、通常画像とキャッシュを分ける', async () => {
		const bitmap = { width: 2, height: 1, close: vi.fn() };
		const context = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
		const canvas = {
			width: 0,
			height: 0,
			getContext: () => context,
			toDataURL: () => 'data:image/png;base64,test-logo'
		};
		vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
		vi.stubGlobal('document', { createElement: () => canvas });
		const entity = {
			claims: {
				P18: [{ mainsnak: { datavalue: { value: 'test-building.png' } } }],
				P154: [
					{ rank: 'deprecated', mainsnak: { datavalue: { value: 'test-old-logo.svg' } } },
					{ mainsnak: { datavalue: { value: 'test-alternate-logo.svg' } } },
					{ rank: 'preferred', mainsnak: { datavalue: { value: 'test-logo.svg' } } }
				]
			}
		};
		fetchMock.mockImplementation(async (url: string) =>
			url.startsWith('https://example.com/')
				? new Response(new Blob(['test-logo']))
				: new Response(JSON.stringify({ entities: { Q12: entity } }))
		);
		imageMock.mockImplementation(async (file: string) => ({
			isAllowed: true,
			thumbnail: { source: `https://example.com/${file}` }
		}));
		const { getPoiKnowledge } = await import('./poi-knowledge');
		const normal = await getPoiKnowledge('test-brand', 'Q12');
		const logo = await getPoiKnowledge('test-brand', 'Q12', 'logo');
		expect(normal.image?.thumbnail?.source).toBe('https://example.com/test-building.png');
		expect(logo.image?.thumbnail?.source).toBe('data:image/png;base64,test-logo');
		expect(context.fillStyle).toBe('#ffffff');
		expect(context.fillRect).toHaveBeenCalledWith(0, 0, 2, 1);
		expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0);
		expect(context.fillRect.mock.invocationCallOrder[0]).toBeLessThan(
			context.drawImage.mock.invocationCallOrder[0]
		);
		expect(bitmap.close).toHaveBeenCalledOnce();
		expect(imageMock.mock.calls.map(([file]) => file)).toEqual([
			'test-building.png',
			'test-logo.svg'
		]);
		await getPoiKnowledge('test-brand', 'Q12', 'logo');
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('ロゴがなければP18の写真を取得しない', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({
				entities: {
					Q12: {
						claims: {
							P18: [{ mainsnak: { datavalue: { value: 'test-building.png' } } }]
						}
					}
				}
			}))
		);
		const { getPoiKnowledge } = await import('./poi-knowledge');
		const result = await getPoiKnowledge('test-brand', 'Q12', 'logo');
		expect(result.image).toBeNull();
		expect(imageMock).not.toHaveBeenCalled();
	});

	it('利用条件を確認できないロゴは画像なしにする', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({
				entities: {
					Q12: {
						claims: { P154: [{ mainsnak: { datavalue: { value: 'test-logo.svg' } } }] }
					}
				}
			}))
		);
		imageMock.mockResolvedValue({
			isAllowed: false,
			thumbnail: { source: 'https://example.com/test-logo.svg' }
		});
		const { getPoiKnowledge } = await import('./poi-knowledge');
		expect((await getPoiKnowledge('test-brand', 'Q12', 'logo')).image).toBeNull();
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
