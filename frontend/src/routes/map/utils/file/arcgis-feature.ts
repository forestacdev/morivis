/**
 * ArcGIS REST API FeatureServer / カタログからレイヤー情報を取得するユーティリティ
 */

import type { FeatureCollection } from 'geojson';
import type { ArcGisRenderer } from '$routes/map/utils/file/arcgis-webmap';

// ============================
// カタログ関連
// ============================

export interface ArcGisCatalogService {
	name: string; // フルパス (例: "Hosted/vg_21")
	displayName: string; // 表示名 (例: "vg_21")
	type: 'FeatureServer' | 'MapServer';
	url: string; // サービスのフルURL
}

export interface ArcGisCatalogInfo {
	services: ArcGisCatalogService[];
	folders: string[];
}

/**
 * URLがサービスカタログかどうかを判定する
 * FeatureServer/MapServerで終わらないArcGIS REST URLはカタログとみなす
 */
export const isArcGisCatalogUrl = (url: string): boolean => {
	const cleaned = url.replace(/\/+$/, '').split('?')[0];
	return (
		!cleaned.endsWith('/FeatureServer') &&
		!cleaned.endsWith('/MapServer') &&
		!/\/FeatureServer\/\d+$/.test(cleaned) &&
		!/\/MapServer\/\d+$/.test(cleaned)
	);
};

/**
 * ArcGIS REST サービスカタログからサービス一覧を取得する
 */
export const fetchArcGisCatalog = async (url: string): Promise<ArcGisCatalogInfo> => {
	const baseUrl = url.replace(/\/+$/, '');
	const separator = baseUrl.includes('?') ? '&' : '?';
	const jsonUrl = `${baseUrl}${separator}f=json`;

	const res = await fetch(jsonUrl);
	if (!res.ok) {
		throw new Error(`カタログの取得に失敗しました (${res.status})`);
	}

	const data = await res.json();

	if (data.error) {
		throw new Error(data.error.message || 'ArcGIS REST APIエラー');
	}

	// name にはフォルダパスが含まれる (例: "Hosted/vg_21") ので
	// ベースURLは /services まで遡る
	const cleanUrl = baseUrl.split('?')[0];
	const servicesIdx = cleanUrl.toLowerCase().indexOf('/services');
	const catalogBaseUrl =
		servicesIdx !== -1 ? cleanUrl.substring(0, servicesIdx + '/services'.length) : cleanUrl;

	const services: ArcGisCatalogService[] = (data.services ?? [])
		.filter((s: any) => s.type === 'FeatureServer' || s.type === 'MapServer')
		.map((s: any) => {
			const name = s.name as string;
			const displayName = name.includes('/') ? name.split('/').pop()! : name;
			return {
				name,
				displayName,
				type: s.type as 'FeatureServer' | 'MapServer',
				url: `${catalogBaseUrl}/${name}/${s.type}`
			};
		});

	return {
		services,
		folders: data.folders ?? []
	};
};

export interface ArcGisFeatureTypeInfo {
	id: number | string;
	name: string;
}

export interface ArcGisFeatureLayerInfo {
	id: number;
	name: string;
	geometryType: string; // esriGeometryPoint, esriGeometryPolyline, esriGeometryPolygon
	fields: { name: string; alias: string; type: string }[];
	bounds?: [number, number, number, number];
	maxRecordCount: number;
	description?: string;
	drawingInfo?: { renderer?: ArcGisRenderer };
	typeIdField?: string;
	types?: ArcGisFeatureTypeInfo[];
}

export interface ArcGisFeatureServerInfo {
	name: string;
	layers: ArcGisFeatureLayerInfo[];
	description?: string;
}

/**
 * esriジオメトリタイプをGeoJSONのジオメトリタイプに変換
 */
export const esriGeometryTypeToGeoJSON = (
	esriType: string
): 'Point' | 'LineString' | 'Polygon' | undefined => {
	switch (esriType) {
		case 'esriGeometryPoint':
		case 'esriGeometryMultipoint':
			return 'Point';
		case 'esriGeometryPolyline':
			return 'LineString';
		case 'esriGeometryPolygon':
			return 'Polygon';
		default:
			return undefined;
	}
};

/**
 * FeatureServer URLからサービス情報を取得する
 */
export const fetchArcGisFeatureServerInfo = async (
	url: string
): Promise<ArcGisFeatureServerInfo> => {
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

	const name =
		data.documentInfo?.Title ||
		data.documentInfo?.title ||
		data.serviceDescription ||
		data.description ||
		'ArcGIS FeatureServer';

	// レイヤー情報の取得
	const layerInfos = data.layers ?? [];
	const maxRecordCount = data.maxRecordCount ?? 2000;

	const layers: ArcGisFeatureLayerInfo[] = await Promise.all(
		layerInfos.map(async (layer: any) => {
			const layerUrl = `${baseUrl.split('?')[0]}/${layer.id}`;
			const layerSep = layerUrl.includes('?') ? '&' : '?';
			const layerJsonUrl = `${layerUrl}${layerSep}f=json`;

			try {
				const layerRes = await fetch(layerJsonUrl);
				const layerData = await layerRes.json();

				let bounds: [number, number, number, number] | undefined;
				const ext = layerData.extent;
				if (ext) {
					if (ext.spatialReference?.wkid === 4326 || ext.spatialReference?.latestWkid === 4326) {
						bounds = [ext.xmin, ext.ymin, ext.xmax, ext.ymax];
					} else if (
						ext.spatialReference?.wkid === 102100 ||
						ext.spatialReference?.wkid === 3857 ||
						ext.spatialReference?.latestWkid === 3857
					) {
						bounds = [
							mercatorToLng(ext.xmin),
							mercatorToLat(ext.ymin),
							mercatorToLng(ext.xmax),
							mercatorToLat(ext.ymax)
						];
					} else if (
						ext.spatialReference?.wkid === 4612 ||
						ext.spatialReference?.latestWkid === 4612 ||
						ext.spatialReference?.wkid === 104111
					) {
						// JGD2000 — ほぼWGS84と同等
						bounds = [ext.xmin, ext.ymin, ext.xmax, ext.ymax];
					}
				}

				// types情報の取得
				const types: ArcGisFeatureTypeInfo[] | undefined =
					layerData.types?.length > 0
						? layerData.types.map((t: any) => ({ id: t.id, name: t.name }))
						: undefined;

				return {
					id: layer.id,
					name: layerData.name || layer.name || `Layer ${layer.id}`,
					geometryType: layerData.geometryType || '',
					fields: (layerData.fields ?? []).map((f: any) => ({
						name: f.name,
						alias: f.alias || f.name,
						type: f.type
					})),
					bounds,
					maxRecordCount: layerData.maxRecordCount ?? maxRecordCount,
					description: layerData.description || undefined,
					drawingInfo: layerData.drawingInfo ?? undefined,
					typeIdField: layerData.typeIdField || undefined,
					types
				} satisfies ArcGisFeatureLayerInfo;
			} catch {
				return {
					id: layer.id,
					name: layer.name || `Layer ${layer.id}`,
					geometryType: layer.geometryType || '',
					fields: [],
					bounds: undefined,
					maxRecordCount,
					description: undefined
				} satisfies ArcGisFeatureLayerInfo;
			}
		})
	);

	return {
		name: name.length > 100 ? name.substring(0, 100) : name,
		layers,
		description: data.description || data.serviceDescription || undefined
	};
};

const mercatorToLng = (x: number): number => (x / 20037508.34) * 180;

const mercatorToLat = (y: number): number => {
	const lat = (y / 20037508.34) * 180;
	return (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
};

/**
 * FeatureServerのレイヤーからGeoJSONを取得する（ページネーション対応）
 */
export const fetchFeatureLayerAsGeoJSON = async (
	baseUrl: string,
	layerId: number,
	maxRecordCount: number,
	onProgress?: (fetched: number) => void
): Promise<FeatureCollection> => {
	const layerUrl = `${baseUrl.split('?')[0]}/${layerId}`;
	const allFeatures: any[] = [];
	let offset = 0;
	let hasMore = true;

	while (hasMore) {
		const queryUrl =
			`${layerUrl}/query?f=geojson&where=1%3D1` +
			`&outFields=*&outSR=4326` +
			`&resultOffset=${offset}&resultRecordCount=${maxRecordCount}`;

		const res = await fetch(queryUrl);
		if (!res.ok) {
			throw new Error(`GeoJSONクエリに失敗しました (${res.status})`);
		}

		const data = await res.json();

		if (data.error) {
			throw new Error(data.error.message || 'クエリエラー');
		}

		const features = data.features ?? [];
		allFeatures.push(...features);
		offset += features.length;

		onProgress?.(allFeatures.length);

		// exceededTransferLimitまたは件数がmaxRecordCount未満なら終了
		if (data.exceededTransferLimit !== true || features.length < maxRecordCount) {
			hasMore = false;
		}
	}

	return {
		type: 'FeatureCollection',
		features: allFeatures
	} as FeatureCollection;
};
