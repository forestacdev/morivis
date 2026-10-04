import { DOMParser } from '@xmldom/xmldom';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	buildCswFilter,
	connectCsw,
	getCswImportUrl,
	getCswRecord,
	looksLikeCswUrl,
	parseCswCapabilities,
	parseCswSearchResult,
	searchCswRecords
} from '.';
import { formatCsw } from './definition';
const fixture = (name: string) =>
	readFileSync(new URL(`./__fixtures__/${name}.xml`, import.meta.url), 'utf8');
const service = () =>
	parseCswCapabilities(fixture('test-capabilities'), 'https://test.invalid/csw');
afterEach(() => vi.unstubAllGlobals());

describe('CSW 2.0.2 catalogue', () => {
	it('接続URLを識別し、任意の名前空間prefixと操作別GET URLを読む', () => {
		expect(looksLikeCswUrl('https://test.invalid/catalog?SERVICE=CSW')).toBe(true);
		expect(looksLikeCswUrl('https://test.invalid/srv/eng/csw')).toBe(true);
		expect(looksLikeCswUrl('https://test.invalid/wms?service=WMS')).toBe(false);
		expect(looksLikeCswUrl('javascript:alert(1)')).toBe(false);
		expect(service()).toMatchObject({
			title: 'test-catalogue',
			recordsUrl: 'https://test.invalid/csw',
			typeName: 'csw:Record',
			detailOutputSchema: 'http://www.isotc211.org/2005/gmd'
		});
		const relative = fixture('test-capabilities').replaceAll(
			'https://test.invalid/csw',
			'/query'
		);
		expect(parseCswCapabilities(relative, 'https://test.invalid/catalog').recordsUrl).toBe(
			'https://test.invalid/query'
		);
	});
	it('接続できないバージョン・POST専用・XML異常・例外を区別する', () => {
		expect(() =>
			parseCswCapabilities(
				fixture('test-capabilities').replace('version="2.0.2"', 'version="3.0.0"'),
				'https://test.invalid'
			)
		).toThrow('2.0.2');
		expect(() =>
			parseCswCapabilities(
				fixture('test-capabilities').replaceAll('<o:Get ', '<o:Post '),
				'https://test.invalid'
			)
		).toThrow('GET');
		expect(() => parseCswCapabilities('<test>', 'https://test.invalid')).toThrow('XML');
		expect(() => parseCswCapabilities('<!DOCTYPE test><test/>', 'https://test.invalid'))
			.toThrow('DTD');
		expect(() =>
			parseCswSearchResult(
				'<ExceptionReport><Exception><ExceptionText>test-failure</ExceptionText></Exception></ExceptionReport>',
				'https://test.invalid'
			)
		).toThrow('test-failure');
	});
	it('DCの詳細・配信リンク・CRS84とEPSG:4326の軸順を読む', () => {
		const result = parseCswSearchResult(fixture('test-records'), 'https://test.invalid/csw');
		expect(result).toMatchObject({ matched: 3, returned: 2, nextRecord: 3 });
		expect(result.records[0]).toMatchObject({
			id: 'test-record-1',
			title: 'test-roads',
			abstract: 'test-description & test-more',
			subjects: ['test-topic'],
			bbox: [1, 2, 3, 4]
		});
		expect(result.records[0].links.map(link => link.kind)).toEqual(['wms', 'other']);
		expect(result.records[1].bbox).toEqual([1, 2, 3, 4]);
		expect(result.records[1].links).toEqual([]);
		const last = parseCswSearchResult(
			fixture('test-records-last'),
			'https://test.invalid/csw',
			3
		);
		expect(last.nextRecord).toBe(0);
		expect(last.records[0].links[0].kind).toBe('file');
		const model = fixture('test-records-last').replace('test-points.geojson', 'test-model.obj')
			.replace('WWW:DOWNLOAD-1.0-http--download', '');
		expect(parseCswSearchResult(model, 'https://test.invalid/csw', 3).records[0].links[0].kind)
			.toBe('file');
	});
	it('不整合な件数や循環する次ページを拒否し、0件を正常扱いする', () => {
		const xml = fixture('test-records');
		expect(() =>
			parseCswSearchResult(
				xml.replace('nextRecord="3"', 'nextRecord="1"'),
				'https://test.invalid'
			)
		).toThrow('次ページ');
		expect(() =>
			parseCswSearchResult(
				xml.replace('numberOfRecordsReturned="2"', 'numberOfRecordsReturned="3"'),
				'https://test.invalid'
			)
		).toThrow('一致');
		const empty =
			'<c:GetRecordsResponse xmlns:c="http://www.opengis.net/cat/csw/2.0.2"><c:SearchResults numberOfRecordsMatched="0" numberOfRecordsReturned="0" nextRecord="0"/></c:GetRecordsResponse>';
		expect(parseCswSearchResult(empty, 'https://test.invalid')).toEqual({
			records: [],
			matched: 0,
			returned: 0,
			nextRecord: 0
		});
	});
	it('検索語のXML・ワイルドカードをエスケープし、日付変更線の範囲を分割する', () => {
		const filter = buildCswFilter({ query: '<test & "value">*?', bbox: [170, -2, -170, 2] })!;
		const doc = new DOMParser().parseFromString(filter, 'application/xml');
		expect(doc.getElementsByTagNameNS('*', 'Literal')[0].textContent).toBe(
			'*<test & "value">\\*\\?*'
		);
		expect(doc.getElementsByTagNameNS('*', 'BBOX').length).toBe(2);
		expect(doc.getElementsByTagNameNS('*', 'lowerCorner')[1].textContent).toBe('-180 -2');
		expect(buildCswFilter({})).toBeNull();
		expect(() => buildCswFilter({ bbox: [0, 100, 1, 110] })).toThrow('範囲');
	});
	it('Capabilities→検索→詳細を取得し、古いCSWクエリを除去する', async () => {
		const requests: URL[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: string) => {
				const url = new URL(input);
				requests.push(url);
				const request = url.searchParams.get('request');
				return new Response(fixture(
					request === 'GetCapabilities'
						? 'test-capabilities'
						: request === 'GetRecords'
						? 'test-records'
						: 'test-detail'
				));
			})
		);
		const connected = await connectCsw(
			'https://test.invalid/csw?REQUEST=GetRecords&StartPosition=99&testToken=keep'
		);
		await searchCswRecords(connected, { query: 'test', pageSize: 2, bbox: [1, 2, 3, 4] });
		const record = await getCswRecord(connected, 'test-record-1');
		expect(requests[0].searchParams.get('testToken')).toBe('keep');
		expect(requests[0].searchParams.has('StartPosition')).toBe(false);
		expect(requests[1].searchParams.get('constraintLanguage')).toBe('FILTER');
		expect(requests[1].searchParams.get('maxRecords')).toBe('2');
		expect(requests[2].searchParams.get('outputSchema')).toBe(
			'http://www.isotc211.org/2005/gmd'
		);
		expect(record).toMatchObject({
			id: 'test-record-1',
			title: 'test-roads-detail',
			bbox: [1, 2, 3, 4],
			subjects: ['test-topic']
		});
		expect(record.links.map(link => link.kind)).toEqual(['wfs', 'file']);
		expect(record.links[0].url).toBe('https://test.invalid/wfs');
	});
	it('HTTP失敗・応答サイズ上限・キャンセル・識別子不一致を隠さない', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('test-error', { status: 503 })));
		await expect(connectCsw('https://test.invalid/csw')).rejects.toThrow('503');
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				new Response('test', {
					headers: { 'content-length': String(formatCsw.limits.maxMetadataBytes + 1) }
				})
			)
		);
		await expect(connectCsw('https://test.invalid/csw')).rejects.toThrow('5 MiB');
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_: string, init: RequestInit) => {
				init.signal?.throwIfAborted();
				return new Response(fixture('test-detail'));
			})
		);
		const controller = new AbortController();
		controller.abort();
		await expect(connectCsw('https://test.invalid/csw', controller.signal)).rejects.toThrow();
		await expect(getCswRecord(service(), 'test-missing')).rejects.toThrow('見つかりません');
		await expect(searchCswRecords(service(), { pageSize: 101 })).rejects.toThrow('ページ');
	});
	it('サービス配信リンクをCapabilitiesに揃え、外部ページや危険なschemeはインポートしない', () => {
		const link =
			parseCswSearchResult(fixture('test-records'), 'https://test.invalid').records[0]
				.links[0];
		const url = new URL(getCswImportUrl(link)!);
		expect(url.searchParams.get('request')).toBe('GetCapabilities');
		expect(url.searchParams.get('service')).toBe('WMS');
		expect(url.searchParams.get('layers')).toBe('test-roads');
		expect(getCswImportUrl({ ...link, url: 'javascript:alert(1)' })).toBeNull();
		expect(getCswImportUrl({ ...link, kind: 'other' })).toBeNull();
	});
});
