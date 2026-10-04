import { formatOrbit } from './definition';

export const isOmmObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === 'object' && !Array.isArray(value)
	&& ['EPOCH', 'NORAD_CAT_ID', 'MEAN_MOTION', 'ECCENTRICITY'].every(key => key in value);

export const isOrbitFile = async (file: File): Promise<boolean> => {
	if (/\.(?:tle|omm)$/i.test(file.name)) return true;
	if (!/\.(?:txt|json)$/i.test(file.name)) return false;
	if (/\.txt$/i.test(file.name)) {
		const text = await file.slice(0, 4096).text();
		return /^1 [A-HJ-NP-Z\d]\d{4}[A-Z ] /m.test(text.replace(/^\uFEFF/, ''))
			&& /^2 [A-HJ-NP-Z\d]\d{4} /m.test(text);
	}
	if (file.size > formatOrbit.limits.maxFileBytes) return false;
	try {
		const data: unknown = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
		return isOmmObject(Array.isArray(data) ? data[0] : data);
	} catch {
		return false;
	}
};
