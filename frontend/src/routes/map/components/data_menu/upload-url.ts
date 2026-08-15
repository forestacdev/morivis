import { type DialogType } from '$routes/map/types';
import { hasGeoRssMarker } from '$routes/map/utils/formats/georss';
import { parseOgcApiFeaturesService } from '$routes/map/utils/formats/ogc-api-features';
import { parseWfsCapabilities } from '$routes/map/utils/formats/wfs';
import { parseWmsCapabilities } from '$routes/map/utils/formats/wms';
import { parseWmtsCapabilities } from '$routes/map/utils/formats/wmts';
import {
	normalizeHttpTemplateInput,
	normalizeHttpUrlInput
} from '$routes/map/utils/platform/request';
import { getMatchedExtension } from '$routes/map/utils/upload-matchers-common';
import {
	extractUploadUrlFeatures,
	hasTileExtension,
	isPmtilesExtension,
	isRasterTileExtension,
	isTilesetJson,
	isGeoRssExtension,
	isVectorTileExtension,
	isWmsTemplate,
	isXyzTemplate,
	looksLikeWfsService,
	type UploadUrlContext,
	type UploadUrlFeatures,
	type UploadUrlMatcher
} from './upload-url-matchers';

const getFileNameFromContentDisposition = (headerValue: string | null): string | null => {
	if (!headerValue) return null;

	const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
	if (utf8Match?.[1]) {
		try {
			return decodeURIComponent(utf8Match[1]);
		} catch {
			return utf8Match[1];
		}
	}

	const plainMatch = headerValue.match(/filename="?([^";]+)"?/i);
	return plainMatch?.[1] ?? null;
};

const getFallbackRemoteBaseName = (urlValue: string) => {
	try {
		const pathname = new URL(urlValue).pathname;
		const lastSegment = pathname
			.split('/')
			.map((segment) => decodeURIComponent(segment))
			.filter(Boolean)
			.pop();

		if (!lastSegment) return 'remote-file';

		const withoutExtension = lastSegment.replace(/\.[^.]+$/, '').trim();
		return withoutExtension || 'remote-file';
	} catch {
		return 'remote-file';
	}
};

const getRemoteFileNameFromContentType = (
	urlValue: string,
	response: Response,
	previewText?: string | null
) => {
	const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
	const baseName = getFallbackRemoteBaseName(urlValue);

	if (contentType.includes('application/rss+xml')) {
		return `${baseName}.rss`;
	}

	if (contentType.includes('application/atom+xml')) {
		return `${baseName}.atom`;
	}

	if (previewText && hasGeoRssMarker(previewText)) {
		return `${baseName}.rss`;
	}

	return null;
};

const isWmsOrWmtsUrl = async (urlValue: string): Promise<boolean> => {
	let wmtsResult = await parseWmtsCapabilities(urlValue);

	if ((!wmtsResult || wmtsResult.length === 0) && /epsg4326/i.test(urlValue)) {
		const mercatorUrl = urlValue.replace(/epsg4326/gi, 'epsg3857');
		wmtsResult = await parseWmtsCapabilities(mercatorUrl);
	}

	if (wmtsResult && wmtsResult.length > 0) {
		return true;
	}

	const wmsResult = await parseWmsCapabilities(urlValue);
	return !!(wmsResult && wmsResult.length > 0);
};

const isWfsUrl = async (urlValue: string): Promise<boolean> => {
	const result = await parseWfsCapabilities(urlValue);
	return !!(result && result.featureTypes.length > 0);
};

const isOgcApiFeaturesUrl = async (urlValue: string): Promise<boolean> => {
	const result = await parseOgcApiFeaturesService(urlValue);
	return !!(result && result.collections.length > 0);
};

export const getRemoteFileName = async (
	urlValue: string,
	response: Response,
	blob?: Blob
): Promise<string | null> => {
	const contentDispositionName = getFileNameFromContentDisposition(
		response.headers.get('content-disposition')
	);
	if (contentDispositionName && getMatchedExtension(contentDispositionName)) {
		return contentDispositionName;
	}

	try {
		const pathname = new URL(urlValue).pathname;
		const pathName = pathname.split('/').pop();
		if (pathName) {
			const decodedPathName = decodeURIComponent(pathName);
			if (getMatchedExtension(decodedPathName)) {
				return decodedPathName;
			}
		}
	} catch {
		return getRemoteFileNameFromContentType(urlValue, response);
	}

	const previewText = blob
		? await blob
				.slice(0, 2000)
				.text()
				.then((text) => text)
				.catch(() => null)
		: null;

	return getRemoteFileNameFromContentType(urlValue, response, previewText);
};

export const validateUploadUrlInput = (value: string): string | null => {
	if (!value.trim()) return 'URLを入力してください';
	if (!normalizeHttpTemplateInput(value)) {
		return 'http(s) または s3:// で始まるURLを入力してください';
	}
	return '';
};

// UploadPane に返す遷移先。dialog はフォーム表示、remote-file は実ファイル取得へ進む。
type UploadUrlDialogTarget =
	| 'remoteRasterUrl'
	| 'remoteVectorUrl'
	| 'pendingTileUrl'
	| 'remoteTiles3dUrl'
	| 'remotePmtilesUrl'
	| 'remoteWmtsUrl'
	| 'remoteFeatureServiceUrl';

type UploadUrlDecision =
	| {
		type: 'dialog';
		dialogType: DialogType;
		target: UploadUrlDialogTarget;
		value: string;
	}
	| {
		// 既知ルールで判定できなかったURLを、実ファイルとして取得するためのフォールバック
		type: 'remote-file';
		requestUrl: string;
	}
	| {
		type: 'error';
		message: string;
	};

// 1ルール = 条件判定と返却結果のセット。
type UploadUrlRule = {
	id: string;
	matchAll?: UploadUrlMatcher[];
	match?: (context: UploadUrlContext, features: UploadUrlFeatures) => boolean | Promise<boolean>;
	resolve: (
		context: UploadUrlContext,
		features: UploadUrlFeatures
	) => UploadUrlDecision | Promise<UploadUrlDecision>;
};

const createDialogDecision = (
	dialogType: DialogType,
	target: UploadUrlDialogTarget,
	value: string
): UploadUrlDecision => ({
	type: 'dialog',
	dialogType,
	target,
	value
});

// 同じ入力から、文字列判定用 URL と request 用 URL を分けて作る。
const createContext = (value: string): UploadUrlContext | UploadUrlDecision => {
	const rawInput = value.trim();
	if (!rawInput) {
		return { type: 'error', message: 'URLを入力してください' };
	}

	const templateUrl = normalizeHttpTemplateInput(rawInput);
	if (!templateUrl) {
		return { type: 'error', message: 'http(s) または s3:// で始まるURLを入力してください' };
	}

	const requestUrl = normalizeHttpUrlInput(rawInput);
	if (!requestUrl) {
		return { type: 'error', message: 'URLの正規化に失敗しました' };
	}

	return { rawInput, templateUrl, requestUrl };
};

// URL テンプレートの形だけで判断できるルール群。
const templateRules: UploadUrlRule[] = [
	{
		id: 'xyz-raster',
		matchAll: [isXyzTemplate, hasTileExtension, isRasterTileExtension],
		resolve: (context) => createDialogDecision('raster', 'remoteRasterUrl', context.templateUrl)
	},
	{
		id: 'xyz-vector',
		matchAll: [isXyzTemplate, hasTileExtension, isVectorTileExtension],
		resolve: (context) => createDialogDecision('vector', 'remoteVectorUrl', context.templateUrl)
	},
	{
		id: 'xyz-unknown',
		matchAll: [isXyzTemplate],
		resolve: (context) =>
			createDialogDecision('tileurltype', 'pendingTileUrl', context.templateUrl)
	},
	{
		id: 'wms-template',
		matchAll: [isWmsTemplate],
		resolve: (context) => createDialogDecision('raster', 'remoteRasterUrl', context.templateUrl)
	}
];

// パス末尾や拡張子だけで判断できるルール群。
const extensionRules: UploadUrlRule[] = [
	{
		id: 'tileset-json',
		matchAll: [isTilesetJson],
		resolve: (context) =>
			createDialogDecision('3dtiles', 'remoteTiles3dUrl', context.templateUrl)
	},
	{
		id: 'pmtiles',
		matchAll: [isPmtilesExtension],
		resolve: (context) =>
			createDialogDecision('pmtiles', 'remotePmtilesUrl', context.templateUrl)
	},
	{
		id: 'georss-file',
		matchAll: [isGeoRssExtension],
		resolve: (context) => ({
			type: 'remote-file',
			requestUrl: context.requestUrl
		})
	}
];

// 文字列だけでは確定できないため、実際に問い合わせて判定するルール群。
const serviceRules: UploadUrlRule[] = [
	{
		id: 'wmts-or-wms',
		match: async (context) => await isWmsOrWmtsUrl(context.requestUrl),
		resolve: (context) => createDialogDecision('wmts', 'remoteWmtsUrl', context.requestUrl)
	},
	{
		id: 'wfs-likely',
		match: async (context, features) =>
			looksLikeWfsService(context, features) && (await isWfsUrl(context.requestUrl)),
		resolve: (context) =>
			createDialogDecision('featureservice', 'remoteFeatureServiceUrl', context.requestUrl)
	},
	{
		id: 'ogc-api-features',
		match: async (context) => await isOgcApiFeaturesUrl(context.requestUrl),
		resolve: (context) =>
			createDialogDecision('featureservice', 'remoteFeatureServiceUrl', context.requestUrl)
	},
	{
		id: 'wfs-fallback',
		match: async (context) => await isWfsUrl(context.requestUrl),
		resolve: (context) =>
			createDialogDecision('featureservice', 'remoteFeatureServiceUrl', context.requestUrl)
	}
];

const applyRules = async (
	rules: UploadUrlRule[],
	context: UploadUrlContext,
	features: UploadUrlFeatures
): Promise<UploadUrlDecision | null> => {
	for (const rule of rules) {
		if (rule.matchAll && rule.matchAll.every((matcher) => matcher(context, features))) {
			return await rule.resolve(context, features);
		}

		if (rule.match && (await rule.match(context, features))) {
			return await rule.resolve(context, features);
		}
	}

	return null;
};

export const resolveUploadUrlInput = async (value: string): Promise<UploadUrlDecision> => {
	const contextOrError = createContext(value);
	if ('type' in contextOrError) {
		return contextOrError;
	}

	const context = contextOrError;
	const features = extractUploadUrlFeatures(context);

	// まずは通信なしで確定できるものから順に判定する。
	const templateDecision = await applyRules(templateRules, context, features);
	if (templateDecision) return templateDecision;

	const extensionDecision = await applyRules(extensionRules, context, features);
	if (extensionDecision) return extensionDecision;

	// 文字列判定で落ちなかったものだけ、サービスとして問い合わせる。
	const serviceDecision = await applyRules(serviceRules, context, features);
	if (serviceDecision) return serviceDecision;

	// URL文字列でもサービス応答でも種別を確定できなかった場合は、
	// UploadPane.svelte 側で requestUrl を fetch して実ファイルとして扱う。
	return {
		type: 'remote-file',
		requestUrl: context.requestUrl
	};
};
