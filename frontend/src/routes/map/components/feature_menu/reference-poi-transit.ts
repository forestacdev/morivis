const getText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const getWebsite = (value: unknown): string | undefined => {
	const text = getText(value);
	if (!text) return undefined;
	try {
		const url = new URL(text);
		return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
};

const isBusStop = (properties: Record<string, unknown>): boolean =>
	properties.highway === 'bus_stop' || properties.amenity === 'bus_station'
	|| properties.class === 'bus'
	|| ['bus_stop', 'bus_station'].includes(getText(properties.subclass))
	|| (properties.bus === 'yes'
		&& ['station', 'stop_position', 'platform'].includes(getText(properties.public_transport)));

const isTransitStop = (properties: Record<string, unknown>): boolean => {
	if (isBusStop(properties)) return true;
	if (
		['station', 'halt', 'tram_stop', 'platform', 'subway_entrance'].includes(
			getText(properties.railway)
		)
	) {
		return true;
	}
	if (['station', 'stop_position', 'platform'].includes(getText(properties.public_transport))) {
		return true;
	}
	// OSMタグを取得できなくても、タイルの分類から駅・停留所を判定する。
	return ['station', 'halt', 'tram_stop', 'subway', 'subway_entrance']
		.includes(getText(properties.subclass))
		|| (properties.class === 'railway' && properties.subclass === 'platform');
};

/** 駅・停留所のURLはタグから取得し、検索結果を公式ページとして自動採用しない。 */
export const getTransitPoiLinks = (
	properties: Record<string, unknown>,
	point?: [number, number]
): Array<{ label: string; url: string; }> | null => {
	if (!isTransitStop(properties)) return null;
	const links: Array<{ label: string; url: string; }> = [];
	const website = getWebsite(properties.website) ?? getWebsite(properties['contact:website']);
	const operatorWebsite = getWebsite(properties['operator:website']);
	if (website) links.push({ label: '公式サイト', url: website });
	if (operatorWebsite && operatorWebsite !== website) {
		links.push({ label: '運行事業者', url: operatorWebsite });
	}
	const name = getText(properties['name:ja']) || getText(properties.name);
	if (name) {
		const timetableUrl = new URL(
			isBusStop(properties)
				? 'https://transit.yahoo.co.jp/timetable/bus'
				: 'https://transit.yahoo.co.jp/timetable/search'
		);
		if (isBusStop(properties)) timetableUrl.searchParams.set('page', 'srchlist');
		// Yahoo!の検索フォームと同じ平日指定。候補・路線・曜日はリンク先で選択する。
		timetableUrl.searchParams.set('kind', '1');
		timetableUrl.searchParams.set('q', name);
		links.push({
			label: '時刻表（Yahoo!路線情報）',
			url: timetableUrl.href
		});
		// 片方の地点だけを渡し、もう片方と日時はYahoo!路線情報で入力する。
		links.push({
			label: 'ここから（Yahoo!路線情報）',
			url: `https://transit.yahoo.co.jp/search/result?${new URLSearchParams({ from: name })}`
		}, {
			label: 'ここまで（Yahoo!路線情報）',
			url: `https://transit.yahoo.co.jp/search/result?${new URLSearchParams({ to: name })}`
		});
	}
	if (point) {
		const [lon, lat] = point;
		if (
			Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180
			&& Math.abs(lat) <= 90
		) {
			links.push({
				label: '経路検索（Google マップ）',
				url: `https://www.google.com/maps/dir/?${new URLSearchParams({
					api: '1',
					destination: `${lat},${lon}`,
					travelmode: 'transit'
				})}`
			});
		}
	}
	return links;
};
