import {
	PUBLIC_BASE_PATH,
	PUBLIC_ENTRY_PATH,
	PUBLIC_PANORAMA_PATH,
	PUBLIC_TIMBER_SPECIES_PATH,
	PUBLIC_DISASTER_LORE_ALL_PATH
} from '$env/static/public';
import { devProxyTransform } from './proxy';

const runtimePublicEnvValues = {
	PUBLIC_BASE_PATH,
	PUBLIC_ENTRY_PATH,
	PUBLIC_PANORAMA_PATH,
	PUBLIC_TIMBER_SPECIES_PATH,
	PUBLIC_DISASTER_LORE_ALL_PATH
};

export const resolveRequestUrl = (url: string): string => {
	return import.meta.env.PROD ? url : devProxyTransform(url, runtimePublicEnvValues).url;
};

export const fetchWithDevProxy = async (
	input: string,
	init?: RequestInit
): Promise<Response> => {
	return await fetch(resolveRequestUrl(input), init);
};

export const fetchJsonWithDevProxy = async <T>(
	input: string,
	init?: RequestInit
): Promise<T> => {
	const response = await fetchWithDevProxy(input, init);
	return (await response.json()) as T;
};
