import WMSCapabilities from 'ol/format/WMSCapabilities.js';

const MAX_TIME_STEPS = 1000;

/**
 * ISO 8601 duration (P1Y2M3DT4H5M6S) をミリ秒概算に変換
 */
const parseDuration = (dur: string): number | null => {
	const m = dur.match(
		/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
	);
	if (!m) return null;
	const years = parseInt(m[1] || '0');
	const months = parseInt(m[2] || '0');
	const days = parseInt(m[3] || '0');
	const hours = parseInt(m[4] || '0');
	const mins = parseInt(m[5] || '0');
	const secs = parseFloat(m[6] || '0');
	return (
		years * 365.25 * 86400000 +
		months * 30.4375 * 86400000 +
		days * 86400000 +
		hours * 3600000 +
		mins * 60000 +
		secs * 1000
	);
};

/**
 * ISO 8601 durationを使って日付を進める（年・月は正確に加算）
 */
const addDuration = (date: Date, dur: string): Date => {
	const m = dur.match(
		/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
	);
	if (!m) return new Date(date.getTime() + 1);
	const result = new Date(date);
	const years = parseInt(m[1] || '0');
	const months = parseInt(m[2] || '0');
	const days = parseInt(m[3] || '0');
	const hours = parseInt(m[4] || '0');
	const mins = parseInt(m[5] || '0');
	const secs = parseFloat(m[6] || '0');
	if (years) result.setUTCFullYear(result.getUTCFullYear() + years);
	if (months) result.setUTCMonth(result.getUTCMonth() + months);
	if (days) result.setUTCDate(result.getUTCDate() + days);
	if (hours) result.setUTCHours(result.getUTCHours() + hours);
	if (mins) result.setUTCMinutes(result.getUTCMinutes() + mins);
	if (secs) result.setUTCMilliseconds(result.getUTCMilliseconds() + secs * 1000);
	return result;
};

/**
 * ISO 8601 time interval (start/end/period) を展開する
 * カンマ区切りの場合はそのまま分割する
 */
export const parseTimeValues = (raw: string): string[] => {
	// カンマ区切りの値を含む場合
	if (raw.includes(',')) {
		const parts: string[] = [];
		for (const part of raw.split(',')) {
			const trimmed = part.trim();
			if (!trimmed) continue;
			// 各パートがintervalの場合は展開
			if (trimmed.includes('/')) {
				parts.push(...expandInterval(trimmed));
			} else {
				parts.push(trimmed);
			}
		}
		return parts;
	}
	// 単一interval
	if (raw.includes('/')) {
		return expandInterval(raw.trim());
	}
	return [raw.trim()];
};

const expandInterval = (interval: string): string[] => {
	const parts = interval.split('/');
	if (parts.length !== 3) return [interval];

	const [startStr, endStr, periodStr] = parts;
	const start = new Date(startStr);
	const end = new Date(endStr);
	if (isNaN(start.getTime()) || isNaN(end.getTime())) return [interval];

	const durationMs = parseDuration(periodStr);
	if (!durationMs || durationMs <= 0) return [interval];

	const values: string[] = [];
	let current = start;
	while (current <= end && values.length < MAX_TIME_STEPS) {
		values.push(current.toISOString().replace(/\.\d{3}Z$/, 'Z'));
		current = addDuration(current, periodStr);
	}
	return values.length > 0 ? values : [interval];
};

export interface WmsTimeDimensionInfo {
	values: string[];
}

export interface WmsLayerInfo {
	id: string;
	title: string;
	name: string;
	bbox: [number, number, number, number] | null;
	crs: string[];
	styles: { name: string; title: string }[];
	formats: string[];
	timeDimension?: WmsTimeDimensionInfo;
}

export interface WmsSourceInfo {
	id: string;
	title: string;
	tileUrl: string;
	bbox: [number, number, number, number] | null;
	timeDimension?: WmsTimeDimensionInfo;
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

			let timeDimension: WmsTimeDimensionInfo | undefined;
			if (layer.Dimension) {
				const timeDim = (Array.isArray(layer.Dimension) ? layer.Dimension : [layer.Dimension]).find(
					(d: any) => d.name?.toLowerCase() === 'time'
				);
				if (timeDim?.values) {
					const values = parseTimeValues(timeDim.values).reverse();
					if (values.length > 0) {
						timeDimension = {
							values
						};
					}
				}
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
				formats: [],
				timeDimension
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
		const getMapUrl = result.Capability?.Request?.GetMap?.DCPType?.[0]?.HTTP?.Get?.OnlineResource;

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

			let tileUrl =
				`${baseUrl}${separator}service=WMS&version=${version}&request=GetMap` +
				`&layers=${encodeURIComponent(layer.name)}` +
				`&${srsParam}=EPSG:3857` +
				`&bbox={bbox-epsg-3857}` +
				`&width=256&height=256` +
				`&format=${encodeURIComponent(preferredFormat)}` +
				`&transparent=true`;

			if (layer.timeDimension) {
				tileUrl += '&TIME={time}';
			}

			return {
				id: layer.id,
				title: layer.title,
				tileUrl,
				bbox: layer.bbox,
				timeDimension: layer.timeDimension
			};
		});
	} catch (error) {
		console.error('Failed to fetch or parse WMS Capabilities:', error);
		return null;
	}
};
