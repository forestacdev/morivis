import type { GeoDataEntry } from '$routes/data/types';
import type { MapGeoJSONFeature } from 'maplibre-gl';

// 選択ポップアップ
// TODO 使用していない
export interface ClickedLayerFeaturesData {
	layerEntry: GeoDataEntry;
	feature: MapGeoJSONFeature;
	featureId: number;
}

// サイドメニューのポップアップデータ
export interface FeatureMenuData {
	point: [number, number];
	properties: { [key: string]: string | number | null | undefined } | null;
	featureId: number;
	layerId: string;
}
