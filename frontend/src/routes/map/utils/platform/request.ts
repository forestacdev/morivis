import {
	PUBLIC_BASE_PATH,
	PUBLIC_DISASTER_LORE_ALL_PATH,
	PUBLIC_ENTRY_PATH,
	PUBLIC_PANORAMA_PATH,
	PUBLIC_TIMBER_SPECIES_PATH
} from '$env/static/public';
import type { ResourceType } from 'maplibre-gl';
import { devProxyTransform } from './proxy';

const runtimePublicEnvValues = {
	PUBLIC_BASE_PATH,
	PUBLIC_ENTRY_PATH,
	PUBLIC_PANORAMA_PATH,
	PUBLIC_TIMBER_SPECIES_PATH,
	PUBLIC_DISASTER_LORE_ALL_PATH
};

const resolveRuntimeUrl = (url: string): string => {
	return import.meta.env.PROD ? url : devProxyTransform(url, runtimePublicEnvValues).url;
};

const toAbsoluteUrl = (url: string): string => {
	if (/^[a-z]+:\/\//iu.test(url)) return url;
	const baseUrl = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
	if (url.includes('{fontstack}') || url.includes('{range}')) {
		return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
	}
	return new URL(url, baseUrl).toString();
};

const normalizeStorageSchemeUrl = (value: string): string => {
	if (!/^s3:\/\//iu.test(value)) return value;

	const withoutScheme = value.replace(/^s3:\/\//iu, '');
	const slashIndex = withoutScheme.indexOf('/');
	if (slashIndex < 0) return `https://${withoutScheme}`;

	const host = withoutScheme.slice(0, slashIndex);
	const path = withoutScheme.slice(slashIndex + 1);

	if (host.includes('.')) {
		return `https://${host}/${path}`;
	}

	return `https://${host}.s3.amazonaws.com/${path}`;
};

const ensureProtocol = (value: string): string => {
	return /^[a-z][a-z0-9+.-]*:\/\//iu.test(value) ? value : `https://${value}`;
};

// `{z}` などのテンプレート付き URL を new URL で検証するための一時置換トークン。
const TEMPLATE_TOKEN = '__morivis_template__';

// URL テンプレートの可変部分を固定文字列に置き換え、構文チェックだけ通せる形にする。
const toValidationUrl = (value: string): string => {
	return value.replace(/\{[^}]+\}/g, TEMPLATE_TOKEN);
};

// XYZ などのテンプレート URL を保持したまま、http(s) URL として妥当かだけ判定する。
export const normalizeHttpTemplateInput = (value: string): string | null => {
	const normalized = value.trim();
	if (!normalized) return null;

	const storageNormalized = normalizeStorageSchemeUrl(normalized);
	const withProtocol = ensureProtocol(storageNormalized);

	try {
		const parsed = new URL(toValidationUrl(withProtocol));
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		return withProtocol;
	} catch {
		return null;
	}
};

// 実際にリクエストへ使う通常 URL 向けの正規化。テンプレート URL でも文字列自体は保持する。
export const normalizeHttpUrlInput = (value: string): string | null => {
	const templateUrl = normalizeHttpTemplateInput(value);
	if (!templateUrl) return null;

	try {
		const parsed = new URL(templateUrl);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		return parsed.toString();
	} catch {
		return null;
	}
};

export const resolveMapLibreRequest = (
	url: string,
	resourceType?: ResourceType
): { url: string } => {
	void resourceType;
	return { url: resolveRuntimeUrl(url) };
};

export const resolveRequestUrl = (url: string): string => {
	return resolveRuntimeUrl(url);
};

export const resolveCogProxyUrl = (url: string): string => {
	const resolvedUrl = resolveRuntimeUrl(url);
	if (import.meta.env.PROD) return resolvedUrl;

	const absoluteUrl = toAbsoluteUrl(resolvedUrl);
	const appOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;

	try {
		const parsed = new URL(absoluteUrl);
		if (parsed.origin === appOrigin) return absoluteUrl;

		const proxyUrl = new URL('/api/cog-proxy', appOrigin);
		proxyUrl.searchParams.set('url', absoluteUrl);
		return proxyUrl.toString();
	} catch {
		return absoluteUrl;
	}
};

export const resolveAbsoluteRequestUrl = (url: string): string => {
	return toAbsoluteUrl(resolveRuntimeUrl(url));
};

export const fetchWithDevProxy = async (input: string, init?: RequestInit): Promise<Response> => {
	return await fetch(resolveRequestUrl(input), init);
};

export const fetchResolvedRequestUrl = async (
	url: string,
	init?: RequestInit
): Promise<Response> => {
	return await fetch(url, init);
};

export const fetchJsonWithDevProxy = async <T>(input: string, init?: RequestInit): Promise<T> => {
	const response = await fetchWithDevProxy(input, init);
	return (await response.json()) as T;
};
