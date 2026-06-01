import type { FeatureCollection } from '$routes/map/types/geojson';
import { normalizeGeoJsonGeometryCollections } from '$routes/map/utils/formats/geojson';
import { fetchWithDevProxy } from '$routes/map/utils/platform/request';

export interface OgcApiFeaturesCollectionSummary {
	id: string;
	title: string;
	description: string | null;
	bbox: [number, number, number, number] | null;
}

export interface OgcApiFeaturesServiceInfo {
	rootUrl: string;
	collectionsUrl: string;
	selectedCollectionId: string | null;
	collections: OgcApiFeaturesCollectionSummary[];
}

type JsonObject = Record<string, unknown>;
type CollectionListResponse = JsonObject & { collections: unknown[] };

const JSON_REQUEST_INIT: RequestInit = {
	headers: {
		accept: 'application/json, application/geo+json'
	}
};

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

const appendJsonParam = (url: string): string => {
	const target = new URL(url);
	if (!target.searchParams.has('f')) {
		target.searchParams.set('f', 'json');
	}
	return target.toString();
};

const parseBbox = (value: unknown): [number, number, number, number] | null => {
	if (!Array.isArray(value) || value.length < 4) return null;
	const bbox = value.slice(0, 4).map((part) => Number(part));
	if (bbox.some((part) => !Number.isFinite(part))) return null;
	return bbox as [number, number, number, number];
};

const getCollectionBbox = (collection: JsonObject): [number, number, number, number] | null => {
	const extent = collection.extent;
	if (!extent || typeof extent !== 'object') return null;

	const spatial = (extent as JsonObject).spatial;
	if (!spatial || typeof spatial !== 'object') return null;

	const bbox = (spatial as JsonObject).bbox;
	if (!Array.isArray(bbox) || bbox.length === 0) return null;

	if (Array.isArray(bbox[0])) {
		return parseBbox(bbox[0]);
	}

	return parseBbox(bbox);
};

const mapCollectionSummary = (collection: JsonObject): OgcApiFeaturesCollectionSummary | null => {
	const id = typeof collection.id === 'string' ? collection.id : null;
	if (!id) return null;

	return {
		id,
		title:
			(typeof collection.title === 'string' && collection.title.trim()) ||
			(typeof collection.id === 'string' ? collection.id : 'collection'),
		description: typeof collection.description === 'string' ? collection.description : null,
		bbox: getCollectionBbox(collection)
	};
};

const isFeatureCollectionResponse = (json: unknown): json is JsonObject => {
	return !!json && typeof json === 'object' && (json as JsonObject).type === 'FeatureCollection';
};

const isCollectionListResponse = (json: unknown): json is CollectionListResponse => {
	return !!json && typeof json === 'object' && Array.isArray((json as JsonObject).collections);
};

const isCollectionResponse = (json: unknown): json is JsonObject => {
	return (
		!!json &&
		typeof json === 'object' &&
		typeof (json as JsonObject).id === 'string' &&
		('itemType' in (json as JsonObject) || 'extent' in (json as JsonObject))
	);
};

const getLinkHref = (json: JsonObject, rels: string[]): string | null => {
	const links = json.links;
	if (!Array.isArray(links)) return null;

	for (const link of links) {
		if (!link || typeof link !== 'object') continue;
		const relValue = (link as JsonObject).rel;
		const rel = typeof relValue === 'string' ? relValue : '';
		if (!rels.includes(rel)) continue;

		const hrefValue = (link as JsonObject).href;
		const href = typeof hrefValue === 'string' ? hrefValue : null;
		if (href) return href;
	}

	return null;
};

const normalizeServiceUrls = (
	inputUrl: string
): { rootUrl: string; collectionsUrl: string; selectedCollectionId: string | null; itemsUrl: string | null } => {
	const url = new URL(inputUrl);
	const segments = url.pathname.split('/').filter(Boolean);
	const collectionsIndex = segments.findIndex((segment) => segment === 'collections');

	if (collectionsIndex === -1) {
		return {
			rootUrl: stripTrailingSlash(`${url.origin}${url.pathname}`),
			collectionsUrl: stripTrailingSlash(`${url.origin}${url.pathname}`) + '/collections',
			selectedCollectionId: null,
			itemsUrl: null
		};
	}

	const prefixPath = '/' + segments.slice(0, collectionsIndex).join('/');
	const rootUrl = stripTrailingSlash(`${url.origin}${prefixPath}`);
	const collectionsUrl = `${rootUrl}/collections`;
	const selectedCollectionId = segments[collectionsIndex + 1]
		? decodeURIComponent(segments[collectionsIndex + 1])
		: null;
	const itemsUrl =
		selectedCollectionId && segments[collectionsIndex + 2] === 'items'
			? stripTrailingSlash(`${collectionsUrl}/${encodeURIComponent(selectedCollectionId)}/items`)
			: null;

	return { rootUrl, collectionsUrl, selectedCollectionId, itemsUrl };
};

const fetchJson = async (url: string): Promise<JsonObject> => {
	const response = await fetchWithDevProxy(appendJsonParam(url), JSON_REQUEST_INIT);
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}
	return (await response.json()) as JsonObject;
};

const fetchCollectionsFromLandingPage = async (
	rootUrl: string
): Promise<{ collectionsUrl: string; collections: OgcApiFeaturesCollectionSummary[] }> => {
	const landing = await fetchJson(rootUrl);
	const dataLink =
		getLinkHref(landing, ['data', 'http://www.opengis.net/def/rel/ogc/1.0/data']) ??
		`${stripTrailingSlash(rootUrl)}/collections`;
	const collectionsResponse = await fetchJson(dataLink);
	if (!isCollectionListResponse(collectionsResponse)) {
		throw new Error('Collections response is invalid');
	}

	return {
		collectionsUrl: stripTrailingSlash(dataLink),
		collections: collectionsResponse.collections
			.map((collection: unknown) =>
				collection && typeof collection === 'object'
					? mapCollectionSummary(collection as JsonObject)
					: null
			)
			.filter(
				(collection: OgcApiFeaturesCollectionSummary | null): collection is OgcApiFeaturesCollectionSummary =>
					collection !== null
			)
	};
};

export const parseOgcApiFeaturesService = async (
	inputUrl: string
): Promise<OgcApiFeaturesServiceInfo | null> => {
	try {
		const normalized = normalizeServiceUrls(inputUrl);

		if (normalized.itemsUrl) {
			const collectionResponse = await fetchJson(
				`${normalized.collectionsUrl}/${encodeURIComponent(normalized.selectedCollectionId ?? '')}`
			);
			if (!isCollectionResponse(collectionResponse)) {
				throw new Error('Collection response is invalid');
			}

			const collection = mapCollectionSummary(collectionResponse);
			if (!collection) {
				throw new Error('Collection response is invalid');
			}

			return {
				rootUrl: normalized.rootUrl,
				collectionsUrl: normalized.collectionsUrl,
				selectedCollectionId: collection.id,
				collections: [collection]
			};
		}

		if (normalized.selectedCollectionId) {
			const collectionResponse = await fetchJson(
				`${normalized.collectionsUrl}/${encodeURIComponent(normalized.selectedCollectionId)}`
			);
			if (!isCollectionResponse(collectionResponse)) {
				throw new Error('Collection response is invalid');
			}

			const collection = mapCollectionSummary(collectionResponse);
			if (!collection) {
				throw new Error('Collection response is invalid');
			}

			return {
				rootUrl: normalized.rootUrl,
				collectionsUrl: normalized.collectionsUrl,
				selectedCollectionId: collection.id,
				collections: [collection]
			};
		}

		try {
			const collectionsResponse = await fetchJson(normalized.collectionsUrl);
			if (isCollectionListResponse(collectionsResponse)) {
				const collections = collectionsResponse.collections
					.map((collection: unknown) =>
						collection && typeof collection === 'object'
							? mapCollectionSummary(collection as JsonObject)
							: null
					)
					.filter(
						(collection: OgcApiFeaturesCollectionSummary | null): collection is OgcApiFeaturesCollectionSummary =>
							collection !== null
					);

				return {
					rootUrl: normalized.rootUrl,
					collectionsUrl: normalized.collectionsUrl,
					selectedCollectionId: collections[0]?.id ?? null,
					collections
				};
			}
		} catch {
			// landing page fallback
		}

		const fromLandingPage = await fetchCollectionsFromLandingPage(normalized.rootUrl);
		return {
			rootUrl: normalized.rootUrl,
			collectionsUrl: fromLandingPage.collectionsUrl,
			selectedCollectionId: fromLandingPage.collections[0]?.id ?? null,
			collections: fromLandingPage.collections
		};
	} catch (error) {
		console.error('Failed to parse OGC API - Features service:', error);
		return null;
	}
};

export const buildOgcApiFeaturesItemsUrl = ({
	collectionsUrl,
	collectionId,
	limit
}: {
	collectionsUrl: string;
	collectionId: string;
	limit?: number;
}): string => {
	const itemsUrl = new URL(
		`${stripTrailingSlash(collectionsUrl)}/${encodeURIComponent(collectionId)}/items`
	);
	itemsUrl.searchParams.set('f', 'json');
	if (limit && Number.isFinite(limit) && limit > 0) {
		itemsUrl.searchParams.set('limit', String(limit));
	}
	return itemsUrl.toString();
};

export const fetchOgcApiFeaturesFeatureCollection = async ({
	collectionsUrl,
	collectionId,
	limit
}: {
	collectionsUrl: string;
	collectionId: string;
	limit?: number;
}): Promise<FeatureCollection> => {
	const response = await fetchWithDevProxy(
		buildOgcApiFeaturesItemsUrl({ collectionsUrl, collectionId, limit }),
		JSON_REQUEST_INIT
	);
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	const json = (await response.json()) as unknown;
	if (!isFeatureCollectionResponse(json)) {
		throw new Error('Items response is not a FeatureCollection');
	}

	return normalizeGeoJsonGeometryCollections(json as Parameters<
		typeof normalizeGeoJsonGeometryCollections
	>[0]);
};
