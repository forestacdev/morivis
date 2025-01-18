import type { MapGeoJSONFeature } from 'maplibre-gl';
import type { Title } from '$map/data/types/vector';

/** ポップアップ用のタイトルを生成 */
export const generatePopupTitle = (
	prop: MapGeoJSONFeature['properties'],
	titles: Title[]
): string => {
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
