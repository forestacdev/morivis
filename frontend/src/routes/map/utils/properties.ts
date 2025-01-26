import type { MapGeoJSONFeature } from 'maplibre-gl';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, GeoJSON } from 'geojson';

import type { Title } from '$map/data/types/vector';

/** ポップアップ用のタイトルを生成 */
export const generatePopupTitle = (prop: { [key: string]: any }, titles: Title[]): string => {
	// 条件を満たすテンプレートを検索
	const matchedTemplate = titles.find(({ conditions }) =>
		conditions.every((fieldName) => prop[fieldName] !== undefined)
	)?.template;

	if (!matchedTemplate) return ''; // マッチするテンプレートがない場合、空文字を返す

	// テンプレートを置換
	return matchedTemplate.replace(/\{([^}]+)\}/g, (_, fieldName) => {
		return prop[fieldName] !== undefined ? prop[fieldName] : `{${fieldName}}`;
	});
};

export const getUniquePropertyValues = (
	geojson: FeatureCollection,
	propertyName: string
): any[] => {
	// Set を使用してユニークな値を格納
	const uniqueValues = new Set<any>();

	// 全ての地物（Feature）をループ
	geojson.features.forEach((feature: Feature<Geometry>) => {
		if (feature.properties && propertyName in feature.properties) {
			uniqueValues.add(feature.properties[propertyName]);
		}
	});

	// Set を配列に変換して返す
	return Array.from(uniqueValues);
};
