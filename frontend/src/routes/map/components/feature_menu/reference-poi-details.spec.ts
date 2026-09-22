import type { FeatureMenuData } from '$routes/map/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { osmMock, knowledgeMock } = vi.hoisted(() => ({ osmMock: vi.fn(), knowledgeMock: vi.fn() }));
vi.mock('$routes/map/api/osm-poi', async (importOriginal) => ({
	...await importOriginal<typeof import('$routes/map/api/osm-poi')>(),
	fetchOsmPoiElement: osmMock
}));
vi.mock('$routes/map/api/poi-knowledge', () => ({ getPoiKnowledge: knowledgeMock }));
import { getReferencePoiDetails } from './reference-poi-details';

const data: FeatureMenuData = {
	layerId: '@reference_poi-test',
	featureId: 121,
	referencePoi: true,
	osmIdEncoding: 'planetiler',
	point: [1, 2],
	properties: { name: 'test-poi', subclass: 'test-class' }
};

describe('背景POIの属性表示', () => {
	beforeEach(() => {
		osmMock.mockReset();
		knowledgeMock.mockReset().mockResolvedValue({ article: null });
	});

	it('ID形式の宣言がなければOSM IDを推測せず、元の属性を表示する', async () => {
		const result = await getReferencePoiDetails({ ...data, osmIdEncoding: undefined });
		expect(osmMock).not.toHaveBeenCalled();
		expect(result.attributeItems).toContainEqual(['name', 'test-poi']);
		expect(knowledgeMock).toHaveBeenCalledWith('test-poi', undefined);
	});

	it('確認済みOSMタグを渡し、表示する名称と位置はPOIを維持する', async () => {
		osmMock.mockResolvedValue({
			type: 'node',
			id: 12,
			lon: 1,
			lat: 2,
			tags: { name: 'test-poi', wikidata: 'Q12', 'brand:wikidata': 'Q34' }
		});
		knowledgeMock.mockResolvedValue({
			article: {
				title: 'test-article',
				extract: 'test-extract',
				url: 'https://example.com/test-article'
			}
		});
		const result = await getReferencePoiDetails(data);
		expect(knowledgeMock).toHaveBeenCalledWith('test-poi', 'Q12');
		expect(result.summary.title).toBe('test-poi');
		expect(result.summary.point).toEqual([1, 2]);
		expect(result.attributeItems).toContainEqual(['wikidata', 'Q12']);
		expect(result.summary.description?.text).toBe('test-extract');
		expect(result.brandInformationLabel).toBeUndefined();
	});

	it('名称検索の候補は施設の概要・画像・Wikipediaリンクに混ぜない', async () => {
		osmMock.mockResolvedValue({
			type: 'node',
			id: 12,
			lon: 1,
			lat: 2,
			tags: { name: 'test-poi' }
		});
		const searchCandidate = { title: 'test-related', url: 'https://example.com/test-related' };
		knowledgeMock.mockResolvedValue({ article: null, searchCandidate });
		const result = await getReferencePoiDetails(data);
		expect(result.searchCandidate).toEqual(searchCandidate);
		expect(result.summary.description).toBeUndefined();
		expect(result.summary.media).toEqual([]);
		expect(result.links.some((link) => link.label === 'Wikipedia')).toBe(false);
		expect(result.attributeItems).toContainEqual(['name', 'test-poi']);
	});

	it('brand:wikidataのみならブランド情報と明記し、施設名と位置を維持する', async () => {
		osmMock.mockResolvedValue({
			type: 'node',
			id: 12,
			lon: 1,
			lat: 2,
			tags: { name: 'test-poi', brand: 'test-brand', 'brand:wikidata': 'Q12' }
		});
		knowledgeMock.mockResolvedValue({
			article: {
				title: 'test-brand',
				extract: 'test-brand-description',
				url: 'https://example.com/test-brand',
				thumbnail: { source: 'https://example.com/test-brand.png' }
			},
			wikidataUrl: 'https://www.wikidata.org/wiki/Q12'
		});
		const result = await getReferencePoiDetails(data);
		expect(knowledgeMock).toHaveBeenCalledWith('test-poi', 'Q12');
		expect(result.brandInformationLabel).toBe('ブランド情報：test-brand');
		expect(result.summary.title).toBe('test-poi');
		expect(result.summary.point).toEqual([1, 2]);
		expect(result.summary.description?.text).toBe('test-brand-description');
		expect(result.summary.description?.linkLabel).toBe('ブランドのWikipediaを見る');
		expect(result.summary.media?.[0]).toMatchObject({ type: 'image', alt: 'test-brandの画像' });
		expect(result.links).toContainEqual({
			label: 'ブランドのWikidata',
			url: 'https://www.wikidata.org/wiki/Q12'
		});
		expect(result.links).toContainEqual({
			label: 'ブランドのWikipedia',
			url: 'https://example.com/test-brand'
		});
	});

	it('不正なbrand:wikidataは使わず名称検索に進む', async () => {
		osmMock.mockResolvedValue({
			type: 'node',
			id: 12,
			lon: 1,
			lat: 2,
			tags: { name: 'test-poi', 'brand:wikidata': 'test-invalid-id' }
		});
		const result = await getReferencePoiDetails(data);
		expect(knowledgeMock).toHaveBeenCalledWith('test-poi', undefined);
		expect(result.brandInformationLabel).toBeUndefined();
	});

	it('照合不一致のOSMタグを混ぜない', async () => {
		osmMock.mockResolvedValue({
			type: 'node',
			id: 12,
			lon: 10,
			lat: 20,
			tags: { name: 'test-other', wikidata: 'Q12' }
		});
		const result = await getReferencePoiDetails(data);
		expect(knowledgeMock).toHaveBeenCalledWith('test-poi', undefined);
		expect(result.attributeItems).not.toContainEqual(['wikidata', 'Q12']);
		expect(result.notices).toHaveLength(1);
	});

	it('OSM・Wiki取得失敗でも元の属性を表示できる', async () => {
		osmMock.mockRejectedValue(new Error('test-osm-error'));
		knowledgeMock.mockRejectedValue(new Error('test-wiki-error'));
		const result = await getReferencePoiDetails(data);
		expect(result.attributeItems).toContainEqual(['name', 'test-poi']);
		expect(result.notices).toHaveLength(2);
	});
});
