/**
 * STAC (SpatioTemporal Asset Catalog) クライアント
 *
 * STAC APIと静的カタログ（Static Catalog）の両方に対応
 * - STAC仕様: https://stacspec.org/
 * - STAC API仕様: https://github.com/radiantearth/stac-api-spec
 */

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
		spatial: { bbox: number[][] };
		temporal: { interval: (string | null)[][] };
	};
	assets?: Record<string, StacAsset>;
}

export interface StacAsset {
	href: string;
	type?: string;
	title?: string;
	roles?: string[];
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
export type StacSourceType = 'api' | 'static-collection' | 'static-catalog';

// ---- URLユーティリティ ----

const normalizeUrl = (url: string): string => url.replace(/\/+$/, '');

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
): Promise<{ type: StacSourceType; data: unknown }> => {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
	const data = await res.json();

	// STAC API判定を先に行う（APIのランディングページもtype=Catalogを持つため）
	if (data.conformsTo || data.links?.some((l: StacLink) => l.rel === 'search')) {
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
		const collectionsRes = await fetch(`${normalizeUrl(url)}/collections`);
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
	const res = await fetch(`${normalizeUrl(apiUrl)}/collections`);
	if (!res.ok) throw new Error(`Failed to fetch collections: ${res.status}`);
	const data = await res.json();
	return data.collections ?? [];
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
	const url = `${normalizeUrl(apiUrl)}/search`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...params,
			limit: params.limit ?? 10
		})
	});
	if (!res.ok) throw new Error(`STAC search failed: ${res.status}`);
	return res.json();
};

// ---- Static Catalog ----

/** 静的カタログ/コレクションのchildリンクを取得 */
export const fetchChildLinks = async (url: string): Promise<{ title: string; href: string }[]> => {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
	const data = await res.json();

	return (data.links ?? [])
		.filter((l: StacLink) => l.rel === 'child' || l.rel === 'item')
		.map((l: StacLink) => ({
			title: l.title || l.href.split('/').slice(-2, -1)[0] || l.href,
			href: resolveUrl(url, l.href)
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

/** 静的カタログからアイテムを再帰的に取得（深さ制限付き） */
export const fetchStaticItems = async (url: string, limit: number = 20): Promise<StacItem[]> => {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
	const data = await res.json();

	// これ自体がItemの場合
	if (data.type === 'Feature' && data.assets) {
		return [resolveItemAssets(data as StacItem, url)];
	}

	const links: StacLink[] = data.links ?? [];

	// itemリンクがあればそれを取得
	const itemLinks = links.filter((l) => l.rel === 'item');
	if (itemLinks.length > 0) {
		const items: StacItem[] = [];
		for (const link of itemLinks.slice(0, limit)) {
			const itemUrl = resolveUrl(url, link.href);
			try {
				const itemRes = await fetch(itemUrl);
				if (itemRes.ok) {
					const item = await itemRes.json();
					if (item.type === 'Feature') items.push(resolveItemAssets(item, itemUrl));
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
export const getCogAssets = (item: StacItem): { key: string; asset: StacAsset }[] =>
	Object.entries(item.assets)
		.filter(([, asset]) => {
			if (!asset.href || asset.href === 'N/A') return false;
			const type = asset.type?.toLowerCase() ?? '';
			const roles = asset.roles ?? [];
			return (
				type.includes('geotiff') ||
				type.includes('tiff') ||
				roles.includes('data') ||
				roles.includes('visual') ||
				asset.href.endsWith('.tif') ||
				asset.href.endsWith('.tiff')
			);
		})
		.map(([key, asset]) => ({ key, asset }));

/** アイテムからサムネイルURLを取得 */
export const getThumbnailUrl = (item: StacItem): string | null => {
	const thumb =
		item.assets['thumbnail'] ??
		item.assets['rendered_preview'] ??
		Object.values(item.assets).find((a) => a.roles?.includes('thumbnail'));
	return thumb?.href ?? null;
};
