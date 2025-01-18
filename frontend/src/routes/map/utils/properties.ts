import type { MapGeoJSONFeature } from 'maplibre-gl';

/** ポップアップ用のタイトルを生成 */
export const generatePopupTitle = (
	prop: MapGeoJSONFeature['properties'],
	titleTemplate: string
): string => {
	return titleTemplate.replace(/\{(\w+)\}/g, (_, fieldName) => {
		return prop[fieldName] !== undefined ? prop[fieldName] : `{${fieldName}}`;
	});
};
