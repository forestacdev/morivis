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

const isTransitStop = (properties: Record<string, unknown>): boolean => {
	if (properties.highway === 'bus_stop' || properties.amenity === 'bus_station') return true;
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
	return properties.class === 'bus'
		|| ['station', 'halt', 'tram_stop', 'bus_stop', 'bus_station', 'subway', 'subway_entrance']
			.includes(getText(properties.subclass))
		|| (properties.class === 'railway' && properties.subclass === 'platform');
};

/** 駅・停留所のURLはタグから取得し、検索結果を公式ページとして自動採用しない。 */
export const getTransitPoiLinks = (
	properties: Record<string, unknown>
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
		const operator = getText(properties['operator:ja']) || getText(properties.operator)
			|| getText(properties['network:ja']) || getText(properties.network);
		const query = [name, operator, getText(properties['addr:city']), '時刻表'].filter(Boolean)
			.join(' ');
		links.push({
			label: '時刻表を検索',
			url: `https://www.google.com/search?${new URLSearchParams({ q: query })}`
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
	return links;
};
