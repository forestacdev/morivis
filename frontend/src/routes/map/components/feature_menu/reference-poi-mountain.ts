import { lonLatToPrefectureName } from '$routes/map/api/address';

const getText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

export const getMountainPoiLink = async (
	properties: Record<string, unknown>,
	point: [number, number]
): Promise<{ label: string; url: string; } | undefined> => {
	const isMountain = [properties.natural, properties.class, properties.subclass]
		.some((value) => value === 'peak' || value === 'volcano');
	const name = getText(properties['name:ja']) || getText(properties.name);
	if (!isMountain || !name) return undefined;
	let region = getText(properties['addr:province']) || getText(properties['addr:state'])
		|| getText(properties['is_in:state']);
	const [lon, lat] = point;
	if (
		!region && Number.isFinite(lon) && Number.isFinite(lat)
		&& Math.abs(lon) <= 180 && Math.abs(lat) <= 90
	) {
		try {
			region = await lonLatToPrefectureName(lon, lat, AbortSignal.timeout(5000));
		} catch {
			// API障害やタイムアウトでも、山名による検索リンクは表示する。
			region = '';
		}
	}
	// 県境などで住所が返らない場合は、山名だけで候補を選べるようにする。
	const keyword = [name, region].filter(Boolean).join(' ');
	return {
		label: 'YAMAPで検索',
		url: `https://yamap.com/search/mountains?${new URLSearchParams({ keyword, sort: 'match' })}`
	};
};
