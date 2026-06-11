/**
 * STAC (SpatioTemporal Asset Catalog) クライアント
 *
 * STAC APIと静的カタログ（Static Catalog）の両方に対応
 * - STAC仕様: https://stacspec.org/
 * - STAC API仕様: https://github.com/radiantearth/stac-api-spec
 */
import { fetchWithDevProxy } from '$routes/map/utils/platform/request';

export interface StacLink {
	href: string;
	rel: string;
	type?: string;
	title?: string;
}

export interface StacCollection {
	id: string;
	type?: string;
	title?: string;
	description: string;
	links: StacLink[];
	extent: {
		spatial: { bbox: number[][]; };
		temporal: { interval: (string | null)[][]; };
	};
	assets?: Record<string, StacAsset>;
}

export interface StacAsset {
	href: string;
	type?: string;
	title?: string;
	roles?: string[];
}

export type StacRenderableAssetType = 'cog' | 'geozarr';

export interface StacRenderableAsset {
	key: string;
	asset: StacAsset;
	type: StacRenderableAssetType;
}

export interface StacItem {
	id: string;
	type: 'Feature';
	bbox: [number, number, number, number];
	geometry: GeoJSON.Geometry;
	properties: {
		datetime?: string;
		'eo:cloud_cover'?: number;
		[key: string]: unknown;
	};
	assets: Record<string, StacAsset>;
	collection?: string;
	links?: StacLink[];
}

export interface StacSearchResult {
	type: 'FeatureCollection';
	features: StacItem[];
	numberMatched?: number;
	numberReturned?: number;
}

export interface StacCatalog {
	id: string;
	type?: string;
	title?: string;
	description?: string;
	links: StacLink[];
}

/** STAC APIかStatic Catalogかの判定結果 */
export type StacSourceType = 'api' | 'static-collection' | 'static-catalog' | 'items-endpoint';

// ---- URLユーティリティ ----

const normalizeUrl = (url: string): string => url.replace(/\/+$/, '');

export const normalizeStacUrl = (url: string): string => {
	try {
		const parsed = new URL(url);
		if (
			parsed.hostname === 'api.explorer.eopf.copernicus.eu'
			&& (parsed.pathname === '/' || parsed.pathname === '')
		) {
			parsed.pathname = '/stac';
			parsed.search = '';
			return parsed.toString();
		}

		if (
			parsed.hostname !== 'api.explorer.eopf.copernicus.eu'
			|| !parsed.pathname.startsWith('/browser/external/')
		) {
			return parsed.toString();
		}

		const externalPath = parsed.pathname.replace('/browser/external/', '');
		const slashIndex = externalPath.indexOf('/');
		if (slashIndex <= 0) return parsed.toString();

		const externalHost = externalPath.slice(0, slashIndex);
		const externalPathname = externalPath.slice(slashIndex);
		const normalized = new URL(`${parsed.protocol}//${externalHost}${externalPathname}`);

		for (const [key, value] of parsed.searchParams.entries()) {
			if (key === '.language' || key === 'language') continue;
			normalized.searchParams.set(key, value);
		}

		return normalized.toString();
	} catch {
		return url;
	}
};

const parseStacJsonResponse = async (
	response: Response,
	requestUrl: string
): Promise<Record<string, unknown>> => {
	const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
	if (contentType.includes('application/json') || contentType.includes('application/geo+json')) {
		return (await response.json()) as Record<string, unknown>;
	}

	const bodyText = await response.text();
	const bodyStart = bodyText.slice(0, 80).trimStart().toLowerCase();
	if (bodyStart.startsWith('<!doctype html') || bodyStart.startsWith('<html')) {
		throw new Error(
			`STAC JSON ではなく HTML が返されました。${requestUrl} ではなく STAC エンドポイントを指定してください。`
		);
	}

	try {
		return JSON.parse(bodyText) as Record<string, unknown>;
	} catch {
		throw new Error(`STAC JSON を読み取れませんでした: ${requestUrl}`);
	}
};

/** 相対URLを絶対URLに変換 */
const resolveUrl = (base: string, relative: string): string => {
	if (relative.startsWith('http://') || relative.startsWith('https://')) return relative;
	const baseDir = base.substring(0, base.lastIndexOf('/') + 1);
	// "./" を除去
	const cleaned = relative.replace(/^\.\//, '');
	return baseDir + cleaned;
};

// ---- ソースタイプ判定 ----

/** URLからSTACソースタイプを自動判定 */
export const detectStacSourceType = async (
	url: string
): Promise<{ type: StacSourceType; data: unknown; }> => {
	const normalizedUrl = normalizeStacUrl(url);
	const res = await fetchWithDevProxy(normalizedUrl);
	if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
	const data = await parseStacJsonResponse(res, normalizedUrl);
	const links = Array.isArray(data.links) ? (data.links as StacLink[]) : [];

	if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
		return { type: 'items-endpoint', data };
	}

	// STAC API判定を先に行う（APIのランディングページもtype=Catalogを持つため）
	if (data.conformsTo || links.some((l) => l.rel === 'search')) {
		return { type: 'api', data };
	}

	// 静的 collection.json / catalog.json
	if (data.type === 'Collection') {
		return { type: 'static-collection', data };
	}
	if (data.type === 'Catalog') {
		return { type: 'static-catalog', data };
	}

	// fallback: /collectionsエンドポイントを試す
	try {
		const collectionsRes = await fetchWithDevProxy(`${normalizeUrl(normalizedUrl)}/collections`);
		if (collectionsRes.ok) {
			return { type: 'api', data };
		}
	} catch {
		// ignore
	}

	throw new Error('STAC APIまたはStatic Catalogとして認識できません');
};

// ---- STAC API ----

/** コレクション一覧を取得（API） */
export const fetchCollections = async (apiUrl: string): Promise<StacCollection[]> => {
	const normalizedUrl = `${normalizeUrl(normalizeStacUrl(apiUrl))}/collections`;
	const res = await fetchWithDevProxy(normalizedUrl);
	if (!res.ok) throw new Error(`Failed to fetch collections: ${res.status}`);
	const data = await parseStacJsonResponse(res, normalizedUrl);
	return Array.isArray(data.collections) ? (data.collections as StacCollection[]) : [];
};

/** アイテム検索（API） */
export const searchItems = async (
	apiUrl: string,
	params: {
		collections?: string[];
		bbox?: [number, number, number, number];
		datetime?: string;
		limit?: number;
	}
): Promise<StacSearchResult> => {
	const url = `${normalizeUrl(normalizeStacUrl(apiUrl))}/search`;
	const res = await fetchWithDevProxy(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...params,
			limit: params.limit ?? 10
		})
	});
	if (!res.ok) throw new Error(`STAC search failed: ${res.status}`);
	return (await parseStacJsonResponse(res, url)) as unknown as StacSearchResult;
};

// ---- Static Catalog ----

/** 静的カタログ/コレクションのchildリンクを取得 */
export const fetchChildLinks = async (url: string): Promise<{ title: string; href: string; }[]> => {
	const normalizedUrl = normalizeStacUrl(url);
	const res = await fetchWithDevProxy(normalizedUrl);
	if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
	const data = await parseStacJsonResponse(res, normalizedUrl);
	const links = Array.isArray(data.links) ? (data.links as StacLink[]) : [];

	return links
		.filter((l) => l.rel === 'child' || l.rel === 'item')
		.map((l) => ({
			title: l.title || l.href.split('/').slice(-2, -1)[0] || l.href,
			href: resolveUrl(normalizedUrl, l.href)
		}));
};

/** アイテム内のアセットhrefを絶対URLに変換 */
const resolveItemAssets = (item: StacItem, itemUrl: string): StacItem => {
	const resolved = { ...item, assets: { ...item.assets } };
	for (const [key, asset] of Object.entries(resolved.assets)) {
		resolved.assets[key] = { ...asset, href: resolveUrl(itemUrl, asset.href) };
	}
	return resolved;
};

const resolveSearchResultAssets = (result: StacSearchResult, url: string): StacSearchResult => {
	return {
		...result,
		features: result.features.map((item) => resolveItemAssets(item, url))
	};
};

/** 静的カタログからアイテムを再帰的に取得（深さ制限付き） */
export const fetchStaticItems = async (url: string, limit: number = 20): Promise<StacItem[]> => {
	const normalizedUrl = normalizeStacUrl(url);
	const res = await fetchWithDevProxy(normalizedUrl);
	if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
	const data = await parseStacJsonResponse(res, normalizedUrl);

	if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
		return resolveSearchResultAssets(data as unknown as StacSearchResult, normalizedUrl).features.slice(0, limit);
	}

	// これ自体がItemの場合
	if (data.type === 'Feature' && data.assets) {
		return [resolveItemAssets(data as unknown as StacItem, normalizedUrl)];
	}

	const links = Array.isArray(data.links) ? (data.links as StacLink[]) : [];

	// itemリンクがあればそれを取得
	const itemLinks = links.filter((l) => l.rel === 'item');
	if (itemLinks.length > 0) {
		const items: StacItem[] = [];
		for (const link of itemLinks.slice(0, limit)) {
			const itemUrl = resolveUrl(normalizedUrl, link.href);
			try {
				const itemRes = await fetchWithDevProxy(itemUrl);
				if (itemRes.ok) {
					const item = await parseStacJsonResponse(itemRes, itemUrl);
					if (item.type === 'Feature') {
						items.push(resolveItemAssets(item as unknown as StacItem, itemUrl));
					}
				}
			} catch {
				// skip
			}
			if (items.length >= limit) break;
		}
		return items;
	}

	// childリンクがあれば最初のchildを辿る
	const childLinks = links.filter((l) => l.rel === 'child');
	if (childLinks.length > 0) {
		// 最新（末尾）のchildを優先
		const lastChild = childLinks[childLinks.length - 1];
		return fetchStaticItems(resolveUrl(url, lastChild.href), limit);
	}

	return [];
};

// ---- 共通ユーティリティ ----

/** アイテムからCOG（Cloud Optimized GeoTIFF）アセットを抽出 */
export const getCogAssets = (item: StacItem): { key: string; asset: StacAsset; }[] =>
	Object.entries(item.assets)
		.filter(([, asset]) => {
			if (!asset.href || asset.href === 'N/A') return false;
			const type = asset.type?.toLowerCase() ?? '';
			const roles = asset.roles ?? [];
			return (
				type.includes('geotiff')
				|| type.includes('tiff')
				|| roles.includes('data')
				|| roles.includes('visual')
				|| asset.href.endsWith('.tif')
				|| asset.href.endsWith('.tiff')
			);
		})
		.map(([key, asset]) => ({ key, asset }));

/** アイテムから GeoZarr / Zarr アセットを抽出 */
export const getGeoZarrAssets = (item: StacItem): { key: string; asset: StacAsset; }[] =>
	Object.entries(item.assets)
		.filter(([, asset]) => {
			if (!asset.href || asset.href === 'N/A') return false;
			const type = asset.type?.toLowerCase() ?? '';
			return (
				type.includes('zarr')
				|| type.includes('geozarr')
				|| asset.href.toLowerCase().includes('.zarr')
			);
		})
		.map(([key, asset]) => ({ key, asset }));

/** アイテムから描画可能アセットを抽出 */
export const getRenderableAssets = (item: StacItem): StacRenderableAsset[] => {
	const renderableAssets: StacRenderableAsset[] = [];
	const seen = new Set<string>();

	for (const { key, asset } of getCogAssets(item)) {
		renderableAssets.push({ key, asset, type: 'cog' });
		seen.add(key);
	}

	for (const { key, asset } of getGeoZarrAssets(item)) {
		if (seen.has(key)) continue;
		renderableAssets.push({ key, asset, type: 'geozarr' });
	}

	return renderableAssets;
};

/** アイテムからサムネイルURLを取得 */
export const getThumbnailUrl = (item: StacItem): string | null => {
	const thumb = item.assets['thumbnail']
		?? item.assets['rendered_preview']
		?? Object.values(item.assets).find((a) => a.roles?.includes('thumbnail'));
	return thumb?.href ?? null;
};
