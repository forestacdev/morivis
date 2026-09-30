import type { ImageLegend } from '$routes/map/data/types/raster';
import { fetchWithDevProxy } from '$routes/map/utils/platform/request';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

/** 元の配信URLを保ち、タイル用プレースホルダーはエンコードしない。 */
export const mapServerRequestUrl = (
	serviceUrl: string,
	path: string,
	parameters: Record<string, string> = {}
): string => {
	const url = new URL(serviceUrl);
	url.searchParams.delete('f');
	Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
	const query = url.searchParams.toString().replace(/%7B/gi, '{').replace(/%7D/gi, '}');
	return `${url.origin}${url.pathname.replace(/\/+$/, '')}${path}${query ? `?${query}` : ''}`;
};

const symbolUrl = (
	symbol: Record<string, unknown>,
	serviceUrl: string,
	layerId: number
): string | undefined => {
	// レスポンスに含まれる画像を保存すると、凡例表示時の追加通信が不要になる。
	if (
		typeof symbol.imageData === 'string' && symbol.imageData.length > 0
		&& /^[a-z0-9+/]+={0,2}$/i.test(symbol.imageData)
		&& typeof symbol.contentType === 'string'
		&& /^image\/(png|jpeg|gif|webp)$/i.test(symbol.contentType)
	) {
		return `data:${symbol.contentType};base64,${symbol.imageData}`;
	}
	if (typeof symbol.url !== 'string' || !symbol.url.trim()) return undefined;
	try {
		const base = new URL(serviceUrl);
		const url = new URL(
			symbol.url,
			`${base.origin}${base.pathname.replace(/\/+$/, '')}/${layerId}/images/`
		);
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
		// 認証パラメータを別の配信元へ転送しない。
		if (url.origin === base.origin) {
			base.searchParams.forEach((value, key) => {
				if (key !== 'f' && !url.searchParams.has(key)) url.searchParams.set(key, value);
			});
		}
		return url.toString();
	} catch {
		return undefined;
	}
};

/** ArcGISの記号とラベルを、既存の画像凡例へ正規化する。 */
export const arcGisLegendToImageLegend = (
	data: unknown,
	serviceUrl: string,
	layerIds?: ReadonlySet<number>
): ImageLegend | undefined => {
	if (!isRecord(data) || data.error || !Array.isArray(data.layers)) {
		throw new Error('ArcGISの凡例を取得できませんでした');
	}
	const categories: ImageLegend['categories'] = [];
	for (const layer of data.layers) {
		if (!isRecord(layer) || typeof layer.layerId !== 'number' || !Array.isArray(layer.legend)) {
			continue;
		}
		if (layerIds && !layerIds.has(layer.layerId)) continue;
		const name = typeof layer.layerName === 'string'
			? layer.layerName
			: `Layer ${layer.layerId}`;
		const urls: string[] = [];
		const labels: string[] = [];
		for (const symbol of layer.legend) {
			if (!isRecord(symbol)) continue;
			const url = symbolUrl(symbol, serviceUrl, layer.layerId);
			if (!url) continue;
			urls.push(url);
			labels.push(
				typeof symbol.label === 'string' && symbol.label.trim() ? symbol.label : name
			);
		}
		if (urls.length) categories.push({ name, urls, labels });
	}
	return categories.length ? { type: 'image', layout: 'symbols', categories } : undefined;
};

export const fetchArcGisLegend = async (
	serviceUrl: string,
	layerIds?: ReadonlySet<number>
): Promise<ImageLegend | undefined> => {
	const response = await fetchWithDevProxy(
		mapServerRequestUrl(serviceUrl, '/legend', { f: 'json' }),
		{
			signal: AbortSignal.timeout(10000)
		}
	);
	if (!response.ok) throw new Error(`ArcGISの凡例を取得できませんでした (${response.status})`);
	return arcGisLegendToImageLegend(await response.json(), serviceUrl, layerIds);
};
