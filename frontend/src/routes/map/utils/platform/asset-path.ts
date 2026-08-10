const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const resolveStaticAssetBasePath = (moduleUrl: string, baseUrl?: string): string => {
	try {
		const { pathname } = new URL(moduleUrl);
		const appIndex = pathname.indexOf('/_app/');

		if (appIndex >= 0) {
			return pathname.slice(0, appIndex);
		}
	} catch {
		// ignore URL parse failures and fall back to configured base
	}

	if (baseUrl && baseUrl !== './') {
		return trimTrailingSlash(baseUrl);
	}

	return '';
};

export const resolveStaticAssetPath = (assetPath: string): string => {
	const normalizedAssetPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
	const basePath = resolveStaticAssetBasePath(import.meta.url, import.meta.env.BASE_URL);

	return `${basePath}${normalizedAssetPath}`;
};
