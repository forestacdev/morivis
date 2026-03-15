import WMSCapabilities from 'ol/format/WMSCapabilities.js';

export interface WmsLayerInfo {
	id: string;
	title: string;
	name: string;
	bbox: [number, number, number, number] | null;
	crs: string[];
	styles: { name: string; title: string }[];
	formats: string[];
}

export interface WmsSourceInfo {
	id: string;
	title: string;
	tileUrl: string;
	bbox: [number, number, number, number] | null;
}

/**
 * WMS GetCapabilities XMLをパースしてレイヤー情報を取得する
 */
const flattenLayers = (layers: any[], result: WmsLayerInfo[] = []): WmsLayerInfo[] => {
	for (const layer of layers) {
		if (layer.Name) {
			let bbox: [number, number, number, number] | null = null;

			// EX_GeographicBoundingBox (WMS 1.3.0)
			if (layer.EX_GeographicBoundingBox) {
				const b = layer.EX_GeographicBoundingBox;
				bbox = [b[0], b[1], b[2], b[3]];
			}
			// BoundingBox fallback
			if (!bbox && layer.BoundingBox?.length > 0) {
				const b = layer.BoundingBox[0].extent;
				if (b) bbox = [b[0], b[1], b[2], b[3]];
			}

			result.push({
				id: layer.Name,
				title: layer.Title || layer.Name,
				name: layer.Name,
				bbox,
				crs: layer.CRS || [],
				styles: (layer.Style || []).map((s: any) => ({
					name: s.Name || '',
					title: s.Title || s.Name || ''
				})),
				formats: []
			});
		}

		// 子レイヤーを再帰的に処理
		if (layer.Layer) {
			flattenLayers(layer.Layer, result);
		}
	}
	return result;
};

/**
 * WMS GetCapabilities URLからレイヤー一覧を取得する
 */
export const parseWmsCapabilities = async (url: string): Promise<WmsSourceInfo[] | null> => {
	try {
		// GetCapabilitiesリクエストURLを構築
		const capUrl = new URL(url);
		if (!capUrl.searchParams.has('service')) capUrl.searchParams.set('service', 'WMS');
		if (!capUrl.searchParams.has('request')) capUrl.searchParams.set('request', 'GetCapabilities');

		const response = await fetch(capUrl.toString());
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const xmlString = await response.text();

		const parser = new WMSCapabilities();
		const result = parser.read(xmlString);

		if (!result?.Capability?.Layer) {
			console.error('Invalid WMS Capabilities document');
			return null;
		}

		// GetMap URLのベースを取得
		const getMapUrl =
			result.Capability?.Request?.GetMap?.DCPType?.[0]?.HTTP?.Get?.OnlineResource;

		if (!getMapUrl) {
			console.error('GetMap URL not found in Capabilities');
			return null;
		}

		// 対応フォーマットを取得
		const formats: string[] = result.Capability?.Request?.GetMap?.Format || [];
		const preferredFormat =
			formats.find((f: string) => f === 'image/png') ||
			formats.find((f: string) => f === 'image/jpeg') ||
			formats[0] ||
			'image/png';

		// WMSバージョンを取得
		const version = result.version || '1.3.0';

		// レイヤーをフラット化
		const allLayers = result.Capability.Layer.Layer
			? flattenLayers(result.Capability.Layer.Layer)
			: flattenLayers([result.Capability.Layer]);

		// MapLibreラスターソース用のURLテンプレートを生成
		return allLayers.map((layer) => {
			const isV13 = version.startsWith('1.3');
			const srsParam = isV13 ? 'CRS' : 'SRS';

			// ベースURLの末尾の?や&を正規化
			const baseUrl = getMapUrl.replace(/[?&]+$/, '');
			const separator = baseUrl.includes('?') ? '&' : '?';

			const tileUrl =
				`${baseUrl}${separator}service=WMS&version=${version}&request=GetMap` +
				`&layers=${encodeURIComponent(layer.name)}` +
				`&${srsParam}=EPSG:3857` +
				`&bbox={bbox-epsg-3857}` +
				`&width=256&height=256` +
				`&format=${encodeURIComponent(preferredFormat)}` +
				`&transparent=true`;

			return {
				id: layer.id,
				title: layer.title,
				tileUrl,
				bbox: layer.bbox
			};
		});
	} catch (error) {
		console.error('Failed to fetch or parse WMS Capabilities:', error);
		return null;
	}
};
