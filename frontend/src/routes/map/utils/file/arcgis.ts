/**
 * ArcGIS REST API MapServer からレイヤー情報を取得するユーティリティ
 */

export interface ArcGisMapServerInfo {
	name: string;
	tileUrl: string;
	minZoom: number;
	maxZoom: number;
	tileSize: number;
	bounds?: [number, number, number, number];
	description?: string;
}

/**
 * MapServer URLからタイル情報を取得する
 * 例: https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer
 */
export const fetchArcGisMapServerInfo = async (url: string): Promise<ArcGisMapServerInfo> => {
	const baseUrl = url.replace(/\/+$/, '');
	const separator = baseUrl.includes('?') ? '&' : '?';
	const jsonUrl = `${baseUrl}${separator}f=json`;

	const res = await fetch(jsonUrl);
	if (!res.ok) {
		throw new Error(`ArcGIS REST APIの取得に失敗しました (${res.status})`);
	}

	const data = await res.json();

	if (data.error) {
		throw new Error(data.error.message || 'ArcGIS REST APIエラー');
	}

	// タイルURLを構築（クエリパラメータを除去してパス部分のみ使用）
	const tileBaseUrl = baseUrl.split('?')[0];
	const tileUrl = `${tileBaseUrl}/tile/{z}/{y}/{x}`;

	// ズーム範囲の取得
	const tileInfo = data.tileInfo;
	let minZoom = 0;
	let maxZoom = 22;

	if (tileInfo?.lods && tileInfo.lods.length > 0) {
		const lods = tileInfo.lods as { level: number }[];
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
			ext.spatialReference?.wkid === 102100 ||
			ext.spatialReference?.wkid === 3857 ||
			ext.spatialReference?.latestWkid === 3857
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

	const name =
		data.documentInfo?.Title || data.documentInfo?.title || data.mapName || data.serviceDescription || 'ArcGIS Layer';

	return {
		name: name.length > 100 ? name.substring(0, 100) : name,
		tileUrl,
		minZoom,
		maxZoom,
		tileSize,
		bounds,
		description: data.description || data.serviceDescription || undefined
	};
};

const mercatorToLng = (x: number): number => (x / 20037508.34) * 180;

const mercatorToLat = (y: number): number => {
	const lat = (y / 20037508.34) * 180;
	return (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
};
