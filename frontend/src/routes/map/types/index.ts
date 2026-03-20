import { geojson } from 'flatgeobuf';
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
export type DialogType =
	| 'raster'
	| 'vector'
	| 'shp'
	| 'gpx'
	| 'geojson'
	| 'geotiff'
	| 'wmts'
	| 'dm'
	| 'dxf'
	| 'sima'
	| 'hdf5'
	| 'csv'
	| 'gpkg'
	| '3dtiles'
	| 'pmtiles'
	| 'glb'
	| 'arcgis'
	| null;

/** ドロップ/ファイル選択で受け付ける拡張子 */
export const SUPPORTED_FILE_EXTENSIONS = [
	'.csv',
	'.geojson',
	'.fgb',
	'.gpkg',
	'.gpx',
	'.shp',
	'.dbf',
	'.shx',
	'.prj',
	'.dxf',
	'.dm',
	'.sim',
	'.pmtiles',
	'.glb',
	'.tif',
	'.tiff',
	'.tfw',
	'.png',
	'.jpg',
	'.jpeg',
	'.pgw',
	'.jgw',
	'.h5'
] as const;

/** input[accept] 用のカンマ区切り文字列 */
export const SUPPORTED_FILE_ACCEPT = SUPPORTED_FILE_EXTENSIONS.join(',');

/** 表示ラベル用のスペース区切り文字列 */
export const SUPPORTED_FILE_LABEL = SUPPORTED_FILE_EXTENSIONS.join(' ');

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
