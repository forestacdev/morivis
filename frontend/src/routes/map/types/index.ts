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
	| 'pointcloud'
	| 'mbtiles'
	| null;

/** ファイル選択/ラベルに表示する主要ファイル拡張子 */
export const SUPPORTED_FILE_EXTENSIONS = [
	'.csv',
	'.geojson',
	'.fgb',
	'.gpkg',
	'.gpx',
	'.shp',
	'.dxf',
	'.dm',
	'.sim',
	'.pmtiles',
	'.glb',
	'.tif',
	'.tiff',
	'.png',
	'.jpg',
	'.jpeg',
	'.h5',
	'.las',
	'.laz',
	'.mbtiles'
] as const;

/** input[accept] 用（主要ファイル + 補助ファイルも受け入れる） */
export const SUPPORTED_FILE_ACCEPT = [
	...SUPPORTED_FILE_EXTENSIONS,
	'.dbf', '.shx', '.prj',       // Shapefile補助
	'.tfw', '.pgw', '.jgw', '.wld' // ワールドファイル
].join(',');

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
