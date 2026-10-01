/**
 * ArcGIS REST API MapServer からレイヤー情報を取得するユーティリティ
 */

import type { ImageLegend } from '$routes/map/data/types/raster';
import { fetchWithDevProxy } from '$routes/map/utils/platform/request';
import { fetchArcGisLegend, mapServerRequestUrl } from './legend';
import { mercatorToLat, mercatorToLng } from './mercator';

export interface ArcGisMapServerInfo {
	name: string;
	tileUrl: string;
	minZoom: number;
	maxZoom: number;
	tileSize: number;
	bounds?: [number, number, number, number];
	description?: string;
	legend?: ImageLegend;
	legendStatus: 'available' | 'empty' | 'unavailable';
}

interface MapServerLayer {
	id: number;
	name?: string;
	parentLayerId?: number;
	subLayerIds?: number[] | null;
	defaultVisibility?: boolean;
}

/** 親グループの非表示も考慮し、実際に描画する末端レイヤーを選ぶ。 */
const visibleLayerIds = (layers: MapServerLayer[], selectedId?: number): Set<number> => {
	const byId = new Map(layers.map((layer) => [layer.id, layer]));
	if (selectedId !== undefined && !byId.has(selectedId)) {
		throw new Error('指定されたMapServerレイヤーが見つかりませんでした');
	}
	return new Set(
		layers.filter((layer) => {
			if (layer.subLayerIds?.length) return false;
			let current: MapServerLayer | undefined = layer;
			const visited = new Set<number>();
			while (current) {
				if (visited.has(current.id)) return false;
				visited.add(current.id);
				if (selectedId !== undefined) {
					if (current.id === selectedId) return true;
				} else if (current.defaultVisibility === false) {
					return false;
				}
				current = byId.get(current.parentLayerId ?? -1);
			}
			return selectedId === undefined;
		}).map((layer) => layer.id)
	);
};

/**
 * MapServer URLからタイル情報を取得する
 * 例: https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer
 */
export const fetchArcGisMapServerInfo = async (url: string): Promise<ArcGisMapServerInfo> => {
	const parsed = new URL(url);
	parsed.pathname = parsed.pathname.replace(/\/+$/, '').replace(/\/query$/i, '');
	const selectedMatch = parsed.pathname.match(/\/MapServer\/(\d+)$/i);
	const selectedId = selectedMatch ? Number(selectedMatch[1]) : undefined;
	if (selectedMatch) parsed.pathname = parsed.pathname.replace(/\/\d+$/, '');
	const baseUrl = parsed.toString();
	const jsonUrl = mapServerRequestUrl(baseUrl, '', { f: 'json' });

	const res = await fetchWithDevProxy(jsonUrl);
	if (!res.ok) {
		throw new Error(`ArcGIS REST APIの取得に失敗しました (${res.status})`);
	}

	const data = await res.json();

	if (data.error) {
		throw new Error(data.error.message || 'ArcGIS REST APIエラー');
	}

	const layers: MapServerLayer[] | undefined = Array.isArray(data.layers)
		? data.layers
		: undefined;
	const layerIds = layers
		? visibleLayerIds(layers, selectedId)
		: selectedId !== undefined
		? new Set([selectedId])
		: undefined;
	// 個別レイヤーや非キャッシュ配信はexportで取得し、凡例と描画対象を一致させる。
	const useTiles = !!data.tileInfo && data.singleFusedMapCache !== false
		&& selectedId === undefined;
	const tileUrl = useTiles
		? mapServerRequestUrl(baseUrl, '/tile/{z}/{y}/{x}')
		: mapServerRequestUrl(baseUrl, '/export', {
			f: 'image',
			bbox: '{bbox-epsg-3857}',
			bboxSR: '3857',
			imageSR: '3857',
			size: '256,256',
			format: 'png32',
			transparent: 'true',
			...(selectedId !== undefined
				? { layers: `show:${[...(layerIds ?? [])].join(',')}` }
				: {})
		});

	// ズーム範囲の取得
	const tileInfo = useTiles ? data.tileInfo : undefined;
	let minZoom = 0;
	let maxZoom = 22;

	if (tileInfo?.lods && tileInfo.lods.length > 0) {
		const lods = tileInfo.lods as { level: number; }[];
		minZoom = Math.min(...lods.map((l) => l.level));
		maxZoom = Math.max(...lods.map((l) => l.level));
	}

	// タイルサイズ
	const tileSize = tileInfo?.rows ?? tileInfo?.cols ?? 256;

	// バウンディングボックス（fullExtent from WGS84）
	let bounds: [number, number, number, number] | undefined;
	const ext = data.fullExtent;
	if (ext) {
		if (ext.spatialReference?.wkid === 4326 || ext.spatialReference?.latestWkid === 4326) {
			bounds = [ext.xmin, ext.ymin, ext.xmax, ext.ymax];
		} else if (
			ext.spatialReference?.wkid === 102100
			|| ext.spatialReference?.wkid === 3857
			|| ext.spatialReference?.latestWkid === 3857
		) {
			// Web Mercatorからの概算変換
			bounds = [
				mercatorToLng(ext.xmin),
				mercatorToLat(ext.ymin),
				mercatorToLng(ext.xmax),
				mercatorToLat(ext.ymax)
			];
		}
	}

	const name = layers?.find((layer) => layer.id === selectedId)?.name
		|| data.documentInfo?.Title
		|| data.documentInfo?.title
		|| data.mapName
		|| data.serviceDescription
		|| 'ArcGIS Layer';

	let legend: ImageLegend | undefined;
	let legendStatus: ArcGisMapServerInfo['legendStatus'];
	try {
		legend = await fetchArcGisLegend(baseUrl, layerIds);
		legendStatus = legend ? 'available' : 'empty';
	} catch {
		// 凡例の非対応・通信失敗は地図本体の登録を妨げない。
		legendStatus = 'unavailable';
	}

	return {
		name: name.length > 100 ? name.substring(0, 100) : name,
		tileUrl,
		minZoom,
		maxZoom,
		tileSize,
		bounds,
		description: data.description || data.serviceDescription || undefined,
		legend,
		legendStatus
	};
};
