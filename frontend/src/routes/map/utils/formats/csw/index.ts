import { fetchWithDevProxy } from '$routes/map/utils/platform/request';
import { getMatchedExtension } from '$routes/map/utils/upload-matchers-common';
import { DOMParser } from '@xmldom/xmldom';
import { formatCsw } from './definition';
import type {
	CswBbox,
	CswLink,
	CswRecord,
	CswSearchOptions,
	CswSearchResult,
	CswService
} from './types';
export type {
	CswBbox,
	CswLink,
	CswRecord,
	CswSearchOptions,
	CswSearchResult,
	CswService
} from './types';

const CSW = 'http://www.opengis.net/cat/csw/2.0.2';
const GMD = 'http://www.isotc211.org/2005/gmd';
const XLINK = 'http://www.w3.org/1999/xlink';
const { maxMetadataBytes: MAX_BYTES, maxFeatures: MAX_RECORDS, timeoutMs: TIMEOUT } =
	formatCsw.limits;
const elements = (node: Element | Document, localName: string): Element[] =>
	Array.from(node.getElementsByTagNameNS('*', localName));
const first = (node: Element | Document, localName: string) => elements(node, localName)[0];
const value = (node: Element | undefined) => node?.textContent?.trim() ?? '';
const text = (node: Element | Document, localName: string) => value(first(node, localName));
const attr = (node: Element | undefined, name: string) => node?.getAttribute(name)?.trim() ?? '';
const httpUrl = (raw: string, base?: string): string | null => {
	if (!raw.trim()) return null;
	try {
		const url = new URL(raw.trim(), base);
		return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
			? url.href
			: null;
	} catch {
		return null;
	}
};
const xmlDocument = (xml: string): Document => {
	if (new TextEncoder().encode(xml).byteLength > MAX_BYTES) {
		throw new Error('CSWの応答が5 MiBを超えています');
	}
	if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
		throw new Error('DTD・外部エンティティを含むCSW XMLは読み込めません');
	}
	let invalid = false;
	const doc = new DOMParser({
		errorHandler: {
			warning: () => {
				invalid = true;
			},
			error: () => {
				invalid = true;
			},
			fatalError: () => {
				invalid = true;
			}
		}
	}).parseFromString(xml, 'application/xml');
	if (invalid || !doc.documentElement) throw new Error('CSWのXMLを読み取れません');
	const exception = first(doc, 'ExceptionText') ?? first(doc, 'ServiceException');
	if (exception || doc.documentElement.localName === 'ExceptionReport') {
		throw new Error(`CSWサービスのエラー: ${value(exception).slice(0, 1000) || '詳細なし'}`);
	}
	return doc;
};
// 入力済みの検索条件は除去し、接続先固有のクエリ（認証キーなど）は保つ。
const REQUEST_PARAMS = new Set([
	'service',
	'version',
	'acceptversions',
	'request',
	'id',
	'elementsetname',
	'elementname',
	'typename',
	'typenames',
	'namespace',
	'outputschema',
	'outputformat',
	'resulttype',
	'startposition',
	'maxrecords',
	'constraint',
	'constraintlanguage',
	'constraint_language_version',
	'sortby'
]);
const requestUrl = (raw: string, request: string, params: Record<string, string> = {}): string => {
	const normalized = httpUrl(raw);
	if (!normalized) throw new Error('CSWにはhttp(s)のURLを指定してください');
	const url = new URL(normalized);
	for (const key of [...url.searchParams.keys()]) {
		if (REQUEST_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
	}
	url.hash = '';
	url.searchParams.set('service', 'CSW');
	url.searchParams.set('version', '2.0.2');
	url.searchParams.set('request', request);
	for (const [key, val] of Object.entries(params)) url.searchParams.set(key, val);
	return url.href;
};
export const looksLikeCswUrl = (raw: string): boolean => {
	const normalized = httpUrl(raw);
	if (!normalized) return false;
	const url = new URL(normalized);
	for (const [key, val] of url.searchParams) {
		if (key.toLowerCase() === 'service') return val.toUpperCase() === 'CSW';
	}
	return /(?:^|\/)csw(?:\/|$)/i.test(url.pathname);
};
const fetchXml = async (
	url: string,
	signal?: AbortSignal
): Promise<{ xml: string; url: string; }> => {
	const timeout = AbortSignal.timeout(TIMEOUT);
	const response = await fetchWithDevProxy(url, {
		signal: signal ? AbortSignal.any([signal, timeout]) : timeout
	});
	if (!response.ok) throw new Error(`CSWデータを取得できませんでした (${response.status})`);
	if (Number(response.headers.get('content-length')) > MAX_BYTES) {
		await response.body?.cancel();
		throw new Error('CSWの応答が5 MiBを超えています');
	}
	const reader = response.body?.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	if (reader) {
		try {
			while (true) {
				const { value: chunk, done } = await reader.read();
				if (done) break;
				size += chunk.byteLength;
				if (size > MAX_BYTES) {
					await reader.cancel();
					throw new Error('CSWの応答が5 MiBを超えています');
				}
				chunks.push(chunk);
			}
		} finally {
			reader.releaseLock();
		}
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return { xml: new TextDecoder().decode(bytes), url: response.url || url };
};
export const parseCswCapabilities = (xml: string, baseUrl: string): CswService => {
	const doc = xmlDocument(xml);
	const root = doc.documentElement;
	if (root.localName !== 'Capabilities' || root.namespaceURI !== CSW) {
		throw new Error('CSW 2.0.2のCapabilitiesではありません');
	}
	if (attr(root, 'version') !== '2.0.2') throw new Error('CSWは2.0.2に対応しています');
	const operation = (name: string) =>
		elements(root, 'Operation').find(el => attr(el, 'name') === name);
	const endpoint = (name: string) => {
		const op = operation(name);
		if (!op) return '';
		const get = first(op, 'Get');
		if (!get) return '';
		return httpUrl(get.getAttributeNS(XLINK, 'href') || attr(get, 'href'), baseUrl) ?? '';
	};
	const recordsUrl = endpoint('GetRecords');
	if (!recordsUrl) throw new Error('このCSWはGETによる検索に対応していません');
	const detailOp = operation('GetRecordById');
	const schemas = detailOp
		? elements(detailOp, 'Parameter').filter(el =>
			attr(el, 'name').toLowerCase() === 'outputschema'
		).flatMap(el => elements(el, 'Value').map(value))
		: [];
	const info = first(root, 'ServiceIdentification');
	return {
		title: info ? text(info, 'Title') || 'CSWカタログ' : 'CSWカタログ',
		url: baseUrl,
		recordsUrl,
		recordByIdUrl: endpoint('GetRecordById'),
		typeName: 'csw:Record',
		outputSchema: CSW,
		detailOutputSchema: schemas.includes(GMD) ? GMD : CSW
	};
};
export const connectCsw = async (url: string, signal?: AbortSignal): Promise<CswService> => {
	const response = await fetchXml(
		requestUrl(url, 'GetCapabilities', { acceptVersions: '2.0.2' }),
		signal
	);
	return parseCswCapabilities(response.xml, response.url);
};
const validBbox = (coords: number[]): coords is CswBbox =>
	coords.length === 4 && coords.every(Number.isFinite)
	&& Math.abs(coords[0]) <= 180 && Math.abs(coords[2]) <= 180 && Math.abs(coords[1]) <= 90
	&& Math.abs(coords[3]) <= 90 && coords[1] <= coords[3];
const parseBbox = (record: Element): CswBbox | null => {
	const iso = first(record, 'EX_GeographicBoundingBox');
	if (iso) {
		const coords = [
			'westBoundLongitude',
			'southBoundLatitude',
			'eastBoundLongitude',
			'northBoundLatitude'
		].map(key => {
			const raw = text(iso, key);
			return raw ? Number(raw) : NaN;
		});
		return validBbox(coords) ? coords : null;
	}
	const box = first(record, 'WGS84BoundingBox') ?? first(record, 'BoundingBox');
	if (!box) return null;
	const crs = attr(box, 'crs');
	// ows:BoundingBoxのEPSG:4326は緯度・経度軸。CRS84とWGS84BoundingBoxは経度・緯度。
	const lower = text(box, 'LowerCorner').split(/\s+/).map(Number);
	const upper = text(box, 'UpperCorner').split(/\s+/).map(Number);
	if (lower.length !== 2 || upper.length !== 2) return null;
	if (crs && !/CRS:?84|4326$/i.test(crs)) return null;
	const latFirst = box.localName !== 'WGS84BoundingBox' && /4326$/i.test(crs);
	const coords = latFirst ? [lower[1], lower[0], upper[1], upper[0]] : [...lower, ...upper];
	return validBbox(coords) ? coords : null;
};
const linkKind = (url: string, protocol: string): CswLink['kind'] => {
	const parsed = new URL(url);
	const service = [...parsed.searchParams].find(([key]) => key.toLowerCase() === 'service')?.[1];
	for (const kind of ['wmts', 'wms', 'wfs'] as const) {
		if (
			service?.toLowerCase() === kind
			|| new RegExp(`(?:^|[^a-z])${kind}(?:[^a-z]|$)`, 'i').test(protocol)
		) return kind;
	}
	if (/download|application\/(?:geo\+json|geopackage\+sqlite3|zip)|image\/tiff/i.test(protocol)) {
		return 'file';
	}
	if (getMatchedExtension(parsed.pathname)) return 'file';
	return 'other';
};
const parseRecord = (node: Element, baseUrl: string): CswRecord => {
	const iso = node.localName === 'MD_Metadata' || node.localName === 'MI_Metadata';
	const id = iso ? text(node, 'fileIdentifier') : text(node, 'identifier');
	const identification = first(node, 'identificationInfo') ?? node;
	const links: CswLink[] = [];
	const addLink = (raw: string, title: string, protocol: string) => {
		const url = httpUrl(raw, baseUrl);
		if (!url) return;
		const link = { url, title: title || url, protocol, kind: linkKind(url, protocol) };
		const existing = links.findIndex(item => item.url === url);
		if (existing < 0) links.push(link);
		else if (links[existing].kind === 'other' && link.kind !== 'other') links[existing] = link;
	};
	if (iso) {
		for (const online of elements(node, 'CI_OnlineResource')) {
			addLink(
				text(online, 'URL'),
				text(online, 'name') || text(online, 'description'),
				text(online, 'protocol')
			);
		}
	} else {
		for (const name of ['URI', 'references', 'relation']) {
			for (const el of elements(node, name)) {
				addLink(
					value(el),
					attr(el, 'name') || attr(el, 'title'),
					attr(el, 'protocol') || attr(el, 'scheme')
				);
			}
		}
	}
	const scope = first(node, 'MD_ScopeCode');
	return {
		id,
		title: text(identification, 'title') || id || '名称なし',
		abstract: text(identification, 'abstract') || text(identification, 'description'),
		type: iso ? attr(scope, 'codeListValue') || value(scope) : text(node, 'type'),
		modified: iso ? text(node, 'dateStamp') : text(node, 'modified') || text(node, 'date'),
		subjects: [
			...new Set(
				elements(identification, iso ? 'keyword' : 'subject').map(value).filter(Boolean)
			)
		],
		bbox: parseBbox(identification),
		links
	};
};
const recordElements = (node: Element): Element[] => {
	const names = new Set(['Record', 'SummaryRecord', 'BriefRecord', 'MD_Metadata', 'MI_Metadata']);
	return Array.from(node.childNodes).filter((child): child is Element =>
		child.nodeType === 1 && names.has((child as Element).localName)
	);
};
const count = (value: string): number => {
	if (!/^\d+$/.test(value)) throw new Error('CSW検索結果の件数を読み取れません');
	const n = Number(value);
	if (!Number.isSafeInteger(n)) throw new Error('CSW検索結果の件数が上限を超えています');
	return n;
};
export const parseCswSearchResult = (
	xml: string,
	baseUrl: string,
	startPosition = 1
): CswSearchResult => {
	const doc = xmlDocument(xml);
	if (
		doc.documentElement.localName !== 'GetRecordsResponse'
		|| doc.documentElement.namespaceURI !== CSW
	) throw new Error('CSWの検索結果ではありません');
	const results = first(doc, 'SearchResults');
	if (!results) throw new Error('CSW検索結果がありません');
	const nodes = recordElements(results);
	if (nodes.length > MAX_RECORDS) throw new Error('CSW検索結果は1回100件までです');
	const records = nodes.map(node => parseRecord(node, baseUrl));
	if (
		records.some(record => !record.id)
		|| new Set(records.map(record => record.id)).size !== records.length
	) {
		throw new Error('CSW検索結果の識別子が空か重複しています');
	}
	const matched = count(attr(results, 'numberOfRecordsMatched'));
	const returned = count(attr(results, 'numberOfRecordsReturned'));
	const nextRecord = count(attr(results, 'nextRecord'));
	if (returned !== records.length || returned > matched) {
		throw new Error('CSW検索結果の件数が一致しません');
	}
	if (
		nextRecord !== 0 && (nextRecord <= startPosition || nextRecord > matched || returned === 0)
	) throw new Error('CSWの次ページ位置が不正です');
	return { records, matched, returned, nextRecord };
};
const escapeXml = (raw: string) =>
	raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
export const buildCswFilter = (options: CswSearchOptions): string | null => {
	const conditions: string[] = [];
	const query = options.query?.trim();
	if (query) {
		if (query.length > 500) throw new Error('検索語は500文字以下にしてください');
		const literal = escapeXml(query.replace(/[\\*?]/g, '\\$&'));
		conditions.push(
			`<ogc:PropertyIsLike wildCard="*" singleChar="?" escapeChar="\\" matchCase="false"><ogc:PropertyName>csw:AnyText</ogc:PropertyName><ogc:Literal>*${literal}*</ogc:Literal></ogc:PropertyIsLike>`
		);
	}
	if (options.bbox) {
		if (!validBbox(options.bbox)) throw new Error('地図範囲が不正です');
		const [west, south, east, north] = options.bbox;
		const box = (w: number, e: number) =>
			`<ogc:BBOX><ogc:PropertyName>ows:BoundingBox</ogc:PropertyName><gml:Envelope srsName="urn:ogc:def:crs:OGC:1.3:CRS84"><gml:lowerCorner>${w} ${south}</gml:lowerCorner><gml:upperCorner>${e} ${north}</gml:upperCorner></gml:Envelope></ogc:BBOX>`;
		conditions.push(
			west > east ? `<ogc:Or>${box(west, 180)}${box(-180, east)}</ogc:Or>` : box(west, east)
		);
	}
	if (!conditions.length) return null;
	return `<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml" xmlns:csw="${CSW}" xmlns:ows="http://www.opengis.net/ows">${
		conditions.length > 1 ? `<ogc:And>${conditions.join('')}</ogc:And>` : conditions[0]
	}</ogc:Filter>`;
};
export const searchCswRecords = async (
	service: CswService,
	options: CswSearchOptions = {},
	signal?: AbortSignal
): Promise<CswSearchResult> => {
	const start = options.startPosition ?? 1;
	const size = options.pageSize ?? 20;
	if (
		!Number.isSafeInteger(start) || start < 1 || !Number.isSafeInteger(size) || size < 1
		|| size > MAX_RECORDS
	) throw new Error('CSWのページ指定が不正です');
	const params: Record<string, string> = {
		resultType: 'results',
		typeNames: service.typeName,
		outputSchema: service.outputSchema,
		elementSetName: 'full',
		outputFormat: 'application/xml',
		startPosition: String(start),
		maxRecords: String(size),
		namespace: `xmlns(csw=${CSW})`
	};
	const filter = buildCswFilter(options);
	if (filter) {
		Object.assign(params, {
			constraintLanguage: 'FILTER',
			constraint_language_version: '1.1.0',
			constraint: filter
		});
	}
	const response = await fetchXml(requestUrl(service.recordsUrl, 'GetRecords', params), signal);
	return parseCswSearchResult(response.xml, response.url, start);
};
export const getCswRecord = async (
	service: CswService,
	id: string,
	signal?: AbortSignal
): Promise<CswRecord> => {
	if (!id) throw new Error('CSWレコードに識別子がありません');
	if (!service.recordByIdUrl) throw new Error('このCSWはGETによる詳細取得に対応していません');
	const response = await fetchXml(
		requestUrl(service.recordByIdUrl, 'GetRecordById', {
			id,
			elementSetName: 'full',
			outputSchema: service.detailOutputSchema ?? service.outputSchema
		}),
		signal
	);
	const doc = xmlDocument(response.xml);
	const root = doc.documentElement;
	const nodes = root.localName === 'GetRecordByIdResponse' ? recordElements(root) : [root];
	const records = nodes.filter(node =>
		['Record', 'MD_Metadata', 'MI_Metadata'].includes(node.localName)
	).map(node => parseRecord(node, response.url));
	const record = records.find(record => record.id === id);
	if (!record) throw new Error('指定されたCSWレコードが見つかりません');
	return record;
};
export const getCswImportUrl = (link: CswLink): string | null => {
	const url = httpUrl(link.url);
	if (!url || link.kind === 'other') return null;
	if (link.kind === 'file') return url;
	const result = new URL(url);
	for (const key of [...result.searchParams.keys()]) {
		if (
			[
				'service',
				'request',
				'version',
				'bbox',
				'width',
				'height',
				'format',
				'srs',
				'crs',
				'outputformat'
			].includes(key.toLowerCase())
		) result.searchParams.delete(key);
	}
	result.hash = '';
	result.searchParams.set('service', link.kind.toUpperCase());
	result.searchParams.set('request', 'GetCapabilities');
	return result.href;
};
