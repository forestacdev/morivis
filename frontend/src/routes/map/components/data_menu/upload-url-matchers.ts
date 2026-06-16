import { looksLikeWfsUrl } from '$routes/map/utils/formats/wfs';
import { getMatchedExtension, getTileUrlExtension } from '$routes/map/utils/upload-matchers-common';

const RASTER_TILE_EXTENSIONS = new Set([
	'.png',
	'.jpg',
	'.jpeg',
	'.webp',
	'.avif',
	'.tif',
	'.tiff'
]);

const VECTOR_TILE_EXTENSIONS = new Set(['.pbf', '.mvt', '.geojson']);

const getRemoteFileNameFromUrl = (urlValue: string): string | null => {
	try {
		const pathname = new URL(urlValue).pathname;
		const pathName = pathname.split('/').pop();
		return pathName ? decodeURIComponent(pathName) : null;
	} catch {
		return null;
	}
};

const isXyzTileUrl = (urlValue: string): boolean => {
	const lowerUrl = urlValue.toLowerCase();
	return (
		lowerUrl.includes('{x}')
		&& lowerUrl.includes('{z}')
		&& (lowerUrl.includes('{y}') || lowerUrl.includes('{-y}'))
	);
};

const isWmsRequestTemplateUrl = (urlValue: string): boolean => {
	try {
		const url = new URL(urlValue);
		const getQueryParam = (name: string): string | null => {
			for (const [key, value] of url.searchParams.entries()) {
				if (key.toLowerCase() === name) return value;
			}
			return null;
		};
		const hasQueryParam = (name: string): boolean => {
			return Array.from(url.searchParams.keys()).some((key) => key.toLowerCase() === name);
		};
		const service = getQueryParam('service')?.toLowerCase();
		const request = getQueryParam('request')?.toLowerCase();
		const lowerUrl = urlValue.toLowerCase();
		const hasBboxTemplate = lowerUrl.includes('{bbox-epsg-3857}')
			|| lowerUrl.includes('{bbox-epsg-4326}')
			|| lowerUrl.includes('{bbox}');
		const hasSize = hasQueryParam('width') && hasQueryParam('height');

		return service === 'wms' && request === 'getmap' && hasBboxTemplate && hasSize;
	} catch {
		return false;
	}
};

const isTilesetJsonUrl = (urlValue: string): boolean => {
	try {
		return new URL(urlValue).pathname.toLowerCase().endsWith('/tileset.json');
	} catch {
		return false;
	}
};

export type UploadUrlContext = {
	rawInput: string;
	templateUrl: string;
	requestUrl: string;
};

export type UploadUrlFeatures = {
	isTilesetJson: boolean;
	isXyzTemplate: boolean;
	isWmsTemplate: boolean;
	remoteFileNameFromTemplateUrl: string | null;
	tileExtension: string | null;
	matchedExtension: string | null;
	looksLikeWfs: boolean;
};

export type UploadUrlMatcher = (
	context: UploadUrlContext,
	features: UploadUrlFeatures
) => boolean;

// ルール評価前に、文字列判定で使う特徴量をまとめておく。
export const extractUploadUrlFeatures = (context: UploadUrlContext): UploadUrlFeatures => {
	const remoteFileNameFromTemplateUrl = getRemoteFileNameFromUrl(context.templateUrl);
	return {
		isTilesetJson: isTilesetJsonUrl(context.templateUrl),
		isXyzTemplate: isXyzTileUrl(context.templateUrl),
		isWmsTemplate: isWmsRequestTemplateUrl(context.templateUrl),
		remoteFileNameFromTemplateUrl,
		tileExtension: remoteFileNameFromTemplateUrl
			? getTileUrlExtension(remoteFileNameFromTemplateUrl)
			: null,
		matchedExtension: remoteFileNameFromTemplateUrl
			? getMatchedExtension(remoteFileNameFromTemplateUrl)
			: null,
		looksLikeWfs: looksLikeWfsUrl(context.requestUrl)
	};
};

export const isTilesetJson: UploadUrlMatcher = (_context, features) => features.isTilesetJson;

export const isXyzTemplate: UploadUrlMatcher = (_context, features) => features.isXyzTemplate;

export const hasTileExtension: UploadUrlMatcher = (_context, features) => !!features.tileExtension;

export const isRasterTileExtension: UploadUrlMatcher = (_context, features) =>
	!!features.tileExtension && RASTER_TILE_EXTENSIONS.has(features.tileExtension);

export const isVectorTileExtension: UploadUrlMatcher = (_context, features) =>
	!!features.tileExtension && VECTOR_TILE_EXTENSIONS.has(features.tileExtension);

export const isWmsTemplate: UploadUrlMatcher = (_context, features) => features.isWmsTemplate;

export const isPmtilesExtension: UploadUrlMatcher = (_context, features) =>
	features.matchedExtension === '.pmtiles';

export const looksLikeWfsService: UploadUrlMatcher = (_context, features) => features.looksLikeWfs;
