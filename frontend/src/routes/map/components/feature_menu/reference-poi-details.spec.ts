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

	it('バス停は公式・時刻表リンクを優先し、ブランドや名称でWikiを取得しない', async () => {
		osmMock.mockResolvedValue({
			type: 'node',
			id: 12,
			lon: 1,
			lat: 2,
			tags: {
				name: 'test-poi',
				highway: 'bus_stop',
				'brand:wikidata': 'Q34',
				website: 'https://example.com/test-stop',
				operator: 'test-operator'
			}
		});
		const result = await getReferencePoiDetails(data);
		expect(result.isTransit).toBe(true);
		expect(result.links[0]).toEqual({
			label: '公式サイト',
			url: 'https://example.com/test-stop'
		});
		expect(result.links.some((link) => link.label === '時刻表（Yahoo!路線情報）')).toBe(true);
		expect(result.links).toContainEqual({
			label: '経路検索（Google マップ）',
			url: 'https://www.google.com/maps/dir/?api=1&destination=2%2C1&travelmode=transit'
		});
		expect(result.links.some((link) => link.label === 'Wikipediaで検索')).toBe(false);
		expect(knowledgeMock).not.toHaveBeenCalled();
		expect(result.summary.description).toBeUndefined();
		expect(result.brandInformationLabel).toBeUndefined();
	});

	it('駅自身のWikidataがある場合は補足の概要を残す', async () => {
		osmMock.mockResolvedValue({
			type: 'node',
			id: 12,
			lon: 1,
			lat: 2,
			tags: { name: 'test-poi', railway: 'station', wikidata: 'Q12' }
		});
		knowledgeMock.mockResolvedValue({
			article: {
				title: 'test-station',
				extract: 'test-history',
				url: 'https://example.com/test-wiki'
			}
		});
		const result = await getReferencePoiDetails(data);
		expect(result.isTransit).toBe(true);
		expect(knowledgeMock).toHaveBeenCalledWith('test-poi', 'Q12', 'image');
		expect(result.summary.description?.text).toBe('test-history');
		expect(result.links[0].label).toBe('時刻表（Yahoo!路線情報）');
	});

	it('OSM取得失敗でもタイルの分類から時刻表検索を出す', async () => {
		osmMock.mockRejectedValue(new Error('test-error'));
		const result = await getReferencePoiDetails({
			...data,
			properties: { name: 'test-stop', class: 'bus', subclass: 'bus_stop' }
		});
		expect(result.isTransit).toBe(true);
		expect(result.links.some((link) => link.label === '時刻表（Yahoo!路線情報）')).toBe(true);
		expect(knowledgeMock).not.toHaveBeenCalled();
	});

	it('ID形式の宣言がなければOSM IDを推測せず、元の属性を表示する', async () => {
		const result = await getReferencePoiDetails({ ...data, osmIdEncoding: undefined });
		expect(osmMock).not.toHaveBeenCalled();
		expect(result.attributeItems).toContainEqual(['name', 'test-poi']);
		expect(knowledgeMock).toHaveBeenCalledWith('test-poi', undefined, 'image');
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
				url: 'https://example.com/test-article',
				thumbnail: { source: 'https://example.com/test-facility.png' }
			}
		});
		const result = await getReferencePoiDetails(data);
		expect(knowledgeMock).toHaveBeenCalledWith('test-poi', 'Q12', 'image');
		expect(result.summary.title).toBe('test-poi');
		expect(result.summary.point).toEqual([1, 2]);
		expect(result.attributeItems).toContainEqual(['wikidata', 'Q12']);
		expect(result.summary.description?.text).toBe('test-extract');
		expect(result.summary.media?.[0]).toMatchObject({
			url: 'https://example.com/test-facility.png'
		});
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
			image: { isAllowed: true, thumbnail: { source: 'https://example.com/test-logo.png' } },
			wikidataUrl: 'https://www.wikidata.org/wiki/Q12'
		});
		const result = await getReferencePoiDetails(data);
		expect(knowledgeMock).toHaveBeenCalledWith('test-poi', 'Q12', 'logo');
		expect(result.brandInformationLabel).toBe('ブランド情報：test-brand');
		expect(result.summary.title).toBe('test-poi');
		expect(result.summary.point).toEqual([1, 2]);
		expect(result.summary.description?.text).toBe('test-brand-description');
		expect(result.summary.description?.linkLabel).toBe('ブランドのWikipediaを見る');
		expect(result.summary.media?.[0]).toMatchObject({
			type: 'image',
			alt: 'test-brandのロゴ',
			url: 'https://example.com/test-logo.png'
		});
		expect(result.links).not.toContainEqual({
			label: 'ブランドのWikidata',
			url: 'https://www.wikidata.org/wiki/Q12'
		});
		expect(result.links).toContainEqual({
			label: 'ブランドのWikipedia',
			url: 'https://example.com/test-brand'
		});
	});

	it('ブランドのロゴがなくてもWikipediaの写真を代わりに表示しない', async () => {
		knowledgeMock.mockResolvedValue({
			article: {
				title: 'test-brand',
				extract: 'test-description',
				url: 'https://example.com/test-brand',
				thumbnail: { source: 'https://example.com/test-building.png' }
			},
			image: null
		});
		const result = await getReferencePoiDetails({
			...data,
			osmIdEncoding: undefined,
			properties: { name: 'test-poi', 'brand:wikidata': 'Q12' }
		});
		expect(knowledgeMock).toHaveBeenCalledWith('test-poi', 'Q12', 'logo');
		expect(result.summary.media).toEqual([]);
		expect(result.summary.description?.text).toBe('test-description');
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
		expect(knowledgeMock).toHaveBeenCalledWith('test-poi', undefined, 'image');
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
		expect(knowledgeMock).toHaveBeenCalledWith('test-poi', undefined, 'image');
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
