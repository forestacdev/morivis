/**
 * ArcGIS Online WebMap からレイヤー情報とスタイルを取得するユーティリティ
 */

import type { ColorMatchExpression, ColorSingleExpression, ColorsStyle } from '$routes/map/data/types/vector/style';
import type { BaseSingleColor } from '$routes/map/utils/color/color-brewer';
import { getRandomColor } from '$routes/map/utils/color/color-brewer';
import type { ArcGisFeatureTypeInfo } from '$routes/map/utils/file/arcgis-feature';

// ============================
// 型定義
// ============================

export interface ArcGisWebMapLayer {
	id: string;
	title: string;
	url: string; // FeatureServer/MapServer のレイヤーURL
	layerType: 'ArcGISFeatureLayer' | 'ArcGISMapImageLayer' | string;
	renderer?: ArcGisRenderer;
	opacity?: number;
}

export interface ArcGisRenderer {
	type: 'simple' | 'uniqueValue' | 'classBreaks';
	field1?: string;
	symbol?: ArcGisSymbol;
	uniqueValueInfos?: ArcGisUniqueValueInfo[];
	defaultSymbol?: ArcGisSymbol;
}

export interface ArcGisUniqueValueInfo {
	value: string;
	label?: string;
	symbol: ArcGisSymbol;
}

export interface ArcGisSymbol {
	type: string;
	color?: [number, number, number, number]; // [R, G, B, A]
	outline?: {
		color?: [number, number, number, number];
		width?: number;
	};
	size?: number;
}

export interface ArcGisWebMapInfo {
	title: string;
	layers: ArcGisWebMapLayer[];
}

// ============================
// URL判定
// ============================

/**
 * ArcGIS Online/Portal の WebMap URL からアイテムIDを抽出
 * 対応パターン:
 *   - https://www.arcgis.com/home/item.html?id=xxx
 *   - https://www.arcgis.com/home/webmap/viewer.html?webmap=xxx
 *   - https://xxx.maps.arcgis.com/home/item.html?id=xxx
 *   - https://xxx.arcgis.com/sharing/rest/content/items/xxx
 *   - 32文字の16進数ID直接入力
 */
export const extractWebMapItemId = (url: string): { portalUrl: string; itemId: string } | null => {
	const trimmed = url.trim();

	// 32文字のhex IDのみの場合
	if (/^[0-9a-f]{32}$/i.test(trimmed)) {
		return { portalUrl: 'https://www.arcgis.com', itemId: trimmed };
	}

	try {
		const parsed = new URL(trimmed);
		const hostname = parsed.hostname;

		// arcgis.com系ドメインかチェック
		if (!hostname.includes('arcgis.com') && !hostname.includes('arcgis.')) {
			return null;
		}

		const portalUrl = `${parsed.protocol}//${hostname}`;

		// ?id=xxx or ?webmap=xxx
		const idParam = parsed.searchParams.get('id') || parsed.searchParams.get('webmap');
		if (idParam && /^[0-9a-f]{32}$/i.test(idParam)) {
			return { portalUrl, itemId: idParam };
		}

		// /content/items/xxx パス
		const itemsMatch = parsed.pathname.match(/\/content\/items\/([0-9a-f]{32})/i);
		if (itemsMatch) {
			return { portalUrl, itemId: itemsMatch[1] };
		}
	} catch {
		// URL解析失敗
	}

	return null;
};

// ============================
// WebMap データ取得
// ============================

/**
 * WebMap のアイテムデータからレイヤー情報とスタイルを取得する
 */
export const fetchArcGisWebMap = async (
	portalUrl: string,
	itemId: string
): Promise<ArcGisWebMapInfo> => {
	// アイテム情報を取得（タイトル用）
	const itemUrl = `${portalUrl}/sharing/rest/content/items/${itemId}?f=json`;
	const itemRes = await fetch(itemUrl);
	if (!itemRes.ok) throw new Error(`WebMapの取得に失敗しました (${itemRes.status})`);
	const itemData = await itemRes.json();

	if (itemData.error) {
		throw new Error(itemData.error.message || 'WebMapの取得に失敗しました');
	}

	if (itemData.type !== 'Web Map') {
		throw new Error('指定されたアイテムはWebMapではありません');
	}

	// WebMapデータを取得
	const dataUrl = `${portalUrl}/sharing/rest/content/items/${itemId}/data?f=json`;
	const dataRes = await fetch(dataUrl);
	if (!dataRes.ok) throw new Error(`WebMapデータの取得に失敗しました (${dataRes.status})`);
	const mapData = await dataRes.json();

	if (mapData.error) {
		throw new Error(mapData.error.message || 'WebMapデータの取得に失敗しました');
	}

	const layers: ArcGisWebMapLayer[] = (mapData.operationalLayers ?? [])
		.filter((l: any) => l.url)
		.map((l: any) => ({
			id: l.id || '',
			title: l.title || l.name || 'レイヤー',
			url: l.url,
			layerType: l.layerType || '',
			renderer: l.layerDefinition?.drawingInfo?.renderer ?? undefined,
			opacity: l.opacity
		}));

	return {
		title: itemData.title || 'WebMap',
		layers
	};
};

// ============================
// スタイル変換
// ============================

/**
 * RGBA配列 [R,G,B,A] を hex カラーコードに変換
 */
const rgbaToHex = (rgba: [number, number, number, number]): string => {
	const [r, g, b] = rgba;
	return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * ArcGIS Renderer を ColorsStyle に変換
 */
export const rendererToColorsStyle = (
	renderer: ArcGisRenderer,
	isPolygon: boolean = false
): ColorsStyle | null => {
	if (renderer.type === 'simple' && renderer.symbol?.color) {
		const hex = rgbaToHex(renderer.symbol.color);
		const singleExpr: ColorSingleExpression = {
			type: 'single',
			key: '単色',
			name: '単色',
			mapping: isPolygon
				? { value: hex as BaseSingleColor, pattern: null }
				: { value: hex as BaseSingleColor }
		};
		return {
			key: '単色',
			show: true,
			expressions: [singleExpr]
		};
	}

	if (renderer.type === 'uniqueValue' && renderer.field1 && renderer.uniqueValueInfos) {
		const infos = renderer.uniqueValueInfos;
		if (infos.length === 0) return null;

		// 属性値が数値の場合、MapLibreのmatch式は型が厳密なので数値として扱う
		const allNumeric = infos.every((i) => i.value !== '' && !isNaN(Number(i.value)));
		const categories: string[] | number[] = allNumeric
			? infos.map((i) => Number(i.value))
			: infos.map((i) => i.value);
		const values = infos.map((i) =>
			i.symbol.color ? rgbaToHex(i.symbol.color) : '#888888'
		);

		const matchExpr: ColorMatchExpression = {
			type: 'match',
			key: renderer.field1,
			name: `${renderer.field1}による色分け`,
			mapping: isPolygon
				? { categories, values, patterns: categories.map(() => null) }
				: { categories, values }
		};

		if (renderer.defaultSymbol?.color) {
			matchExpr.noData = {
				value: rgbaToHex(renderer.defaultSymbol.color),
				pattern: isPolygon ? null : undefined as any
			};
		}

		const singleExpr: ColorSingleExpression = {
			type: 'single',
			key: '単色',
			name: '単色',
			mapping: isPolygon
				? { value: (values[0] ?? '#ff7f00') as BaseSingleColor, pattern: null }
				: { value: (values[0] ?? '#ff7f00') as BaseSingleColor }
		};

		return {
			key: renderer.field1,
			show: true,
			expressions: [singleExpr, matchExpr]
		};
	}

	return null;
};

/**
 * ArcGIS FeatureLayerの types + typeIdField からランダム色分けの ColorsStyle を生成する
 * drawingInfo が無いサービス（CIMシンボル等）でのフォールバック用
 */
export const typesToColorsStyle = (
	typeIdField: string,
	types: ArcGisFeatureTypeInfo[],
	isPolygon: boolean = false
): ColorsStyle | null => {
	if (types.length === 0) return null;

	const allNumeric = types.every(
		(t) => typeof t.id === 'number' || (typeof t.id === 'string' && t.id !== '' && !isNaN(Number(t.id)))
	);
	const categories: string[] | number[] = allNumeric
		? types.map((t) => Number(t.id))
		: types.map((t) => String(t.id));

	const values = types.map(() => getRandomColor());

	const matchExpr: ColorMatchExpression = {
		type: 'match',
		key: typeIdField,
		name: `${typeIdField}による色分け`,
		mapping: isPolygon
			? { categories, values, patterns: categories.map(() => null) }
			: { categories, values }
	};

	const singleExpr: ColorSingleExpression = {
		type: 'single',
		key: '単色',
		name: '単色',
		mapping: isPolygon
			? { value: (values[0] ?? '#ff7f00') as BaseSingleColor, pattern: null }
			: { value: (values[0] ?? '#ff7f00') as BaseSingleColor }
	};

	return {
		key: typeIdField,
		show: true,
		expressions: [singleExpr, matchExpr]
	};
};
