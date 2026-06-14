export const resolveStaticAssetPath = (assetPath: string): string => {
	const baseUrl = import.meta.env.BASE_URL ?? '/';
	return `${baseUrl.replace(/\/$/, '')}/${assetPath.replace(/^\//, '')}`;
};
