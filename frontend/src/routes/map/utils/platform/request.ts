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

export const normalizeHttpUrlInput = (value: string): string | null => {
	const normalized = value.trim();
	if (!normalized) return null;

	const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//iu.test(normalized)
		? normalized
		: `https://${normalized}`;

	try {
		const parsed = new URL(withProtocol);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		return parsed.toString();
	} catch {
		return null;
	}
};

export const resolveMapLibreRequest = (
	url: string,
	resourceType?: ResourceType
): { url: string; } => {
	void resourceType;
	return { url: resolveRuntimeUrl(url) };
};

export const resolveRequestUrl = (url: string): string => {
	return resolveRuntimeUrl(url);
};

export const resolveAbsoluteRequestUrl = (url: string): string => {
	return toAbsoluteUrl(resolveRuntimeUrl(url));
};

export const fetchWithDevProxy = async (input: string, init?: RequestInit): Promise<Response> => {
	return await fetch(resolveRequestUrl(input), init);
};

export const fetchJsonWithDevProxy = async <T>(input: string, init?: RequestInit): Promise<T> => {
	const response = await fetchWithDevProxy(input, init);
	return (await response.json()) as T;
};
