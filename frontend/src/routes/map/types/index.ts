import type { GeoDataEntry } from '$routes/map/data/types';
import type { MapGeoJSONFeature } from 'maplibre-gl';
import type { FeatureProp } from '$routes/map/types/properties';

export type CSSCursor =
	// 基本カーソル
	| 'auto'
	| 'default'
	| 'pointer'
	| 'crosshair'
	| 'text'
	| 'move'
	| 'wait'
	| 'help'
	| 'none'

	// リサイズカーソル
	| 'n-resize'
	| 's-resize'
	| 'e-resize'
	| 'w-resize'
	| 'ne-resize'
	| 'nw-resize'
	| 'se-resize'
	| 'sw-resize'
	| 'ew-resize'
	| 'ns-resize'
	| 'nesw-resize'
	| 'nwse-resize'
	| 'col-resize'
	| 'row-resize'

	// インタラクションカーソル
	| 'grab'
	| 'grabbing'
	| 'not-allowed'
	| 'progress'
	| 'zoom-in'
	| 'zoom-out'
	| 'copy'
	| 'alias'
	| 'context-menu'
	| 'cell'
	| 'vertical-text'
	| 'no-drop'
	| 'all-scroll';

// アップロードのダイアログのタイプ
export type DialogType = 'raster' | 'vector' | 'shp' | 'gpx' | 'wmts' | 'tiff' | null;

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
	properties: FeatureProp | null;
	featureId: number;
	layerId: string;
}
