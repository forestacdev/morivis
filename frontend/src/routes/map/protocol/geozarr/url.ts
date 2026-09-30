export const normalizeGeoZarrUrl = (url: string): string => {
	const trimmed = url.trim();
	if (!trimmed) return trimmed;

	try {
		const parsed = new URL(trimmed);
		parsed.pathname = parsed.pathname
			.replace(/\/(?:\.zmetadata|\.zgroup|\.zarray|\.zattrs|zarr\.json)$/iu, '')
			.replace(/\/+$/u, '');
		return parsed.toString();
	} catch {
		return trimmed
			.replace(/\/(?:\.zmetadata|\.zgroup|\.zarray|\.zattrs|zarr\.json)$/iu, '')
			.replace(/\/+$/u, '');
	}
};
