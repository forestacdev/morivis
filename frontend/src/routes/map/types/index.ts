import { geojson } from 'flatgeobuf';
import type { GeoDataEntry } from '$routes/map/data/types';
import type { MapGeoJSONFeature } from 'maplibre-gl';
import type {
	ResultAddressData,
	ResultCoordinateData,
	ResultPoiData
} from '$routes/map/utils/data/search-result';
export type {
	FeatureMenuData,
	FeaturePanelData,
	FeaturePanelImageSource,
	FeaturePanelImageMedia,
	FeaturePanelMedia,
	FeaturePanelVideoMedia,
	FeaturePanelAudioMedia,
	FeaturePanelSummary,
	LayerFeaturePanelData,
	SearchAddressPanelData,
	SearchCoordinatePanelData,
	SearchPoiPanelData
} from '$routes/map/types/feature-panel';
export {
	createLayerFeaturePanelData,
	createSearchFeaturePanelData
} from '$routes/map/types/feature-panel';

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
	| 'tileurltype'
	| 'shp'
	| 'gpx'
	| 'tcx'
	| 'osm'
	| 'geojson'
	| 'geotiff'
	| 'wmts'
	| 'wcs'
	| 'dm'
	| 'dxf'
	| 'sima'
	| 'hdf5'
	| 'csv'
	| 'tsv'
	| 'gpkg'
	| 'gdb'
	| 'mfjson'
	| '3dtiles'
	| 'pmtiles'
	| 'glb'
	| 'arcgis'
	| 'pointcloud'
	| 'mbtiles'
	| 'netcdf'
	| 'demxml'
	| 'grib2'
	| 'gml'
	| 'kml'
	| 'topojson'
	| 'landxml'
	| 'stac'
	| 'geopdf'
	| 'mojxml'
	| 'geophoto'
	| 'locationhistory'
	| 'gtfs'
	| null;

/** ファイル拡張子のグループ分け（UI表示用） */
export const SUPPORTED_FILE_GROUPS: { label: string; extensions: string[] }[] = [
	{ label: 'GeoJSON', extensions: ['.geojson', '.json'] },
	{ label: 'TopoJSON', extensions: ['.topojson'] },
	{ label: 'FlatGeobuf', extensions: ['.fgb'] },
	{ label: 'GeoPackage', extensions: ['.gpkg'] },
	{ label: 'Shapefile', extensions: ['.shp', '.dbf', '.shx', '.prj', '.cpg'] },
	{ label: 'GPX', extensions: ['.gpx'] },
	{ label: 'TCX', extensions: ['.tcx'] },
	{ label: 'Garmin GDB', extensions: ['.gdb'] },
	{ label: 'OpenStreetMap XML', extensions: ['.osm'] },
	{ label: 'GML', extensions: ['.gml', '.xml'] },
	{ label: 'KML / KMZ', extensions: ['.kml', '.kmz'] },
	{ label: 'CSV', extensions: ['.csv'] },
	{ label: 'TSV', extensions: ['.tsv'] },
	{ label: 'GeoTIFF', extensions: ['.tif', '.tiff'] },
	{ label: 'MBTiles', extensions: ['.mbtiles'] },
	{ label: 'PMTiles', extensions: ['.pmtiles'] },
	{ label: 'HDF5', extensions: ['.h5'] },
	{ label: 'NetCDF', extensions: ['.nc', '.nc4'] },
	{ label: 'GRIB2 (GPV)', extensions: ['.grib2', '.grb2', '.grb', '.bin'] },
	{ label: 'GTFS', extensions: ['.zip'] },
	{ label: 'DXF', extensions: ['.dxf'] },
	{ label: 'SIMA', extensions: ['.sim'] },
	{ label: 'DM', extensions: ['.dm'] },
	{ label: 'LandXML', extensions: ['.landxml'] },
	{ label: '法務局地図XML', extensions: ['.xml'] },
	{ label: '画像 (EXIF GPS)', extensions: ['.png', '.jpg', '.jpeg', '.webp'] },
	{ label: 'GeoPDF', extensions: ['.pdf'] },
	{ label: 'GLB', extensions: ['.glb'] },
	{ label: 'Wavefront OBJ', extensions: ['.obj'] },
	{ label: 'Autodesk 3DS', extensions: ['.3ds'] },
	{ label: 'Collada DAE', extensions: ['.dae'] },
	{ label: '点群', extensions: ['.las', '.laz', '.ply', '.pcd', '.xyz', '.txt'] }
];

/** SUPPORTED_FILE_GROUPS から自動生成 */
export const SUPPORTED_FILE_EXTENSIONS = SUPPORTED_FILE_GROUPS.flatMap((g) => g.extensions);

/** input[accept] 用（主要ファイル + 補助ファイルも受け入れる） */
export const SUPPORTED_FILE_ACCEPT = [
	...SUPPORTED_FILE_EXTENSIONS,
	'.tfw',
	'.pgw',
	'.jgw',
	'.wld', // ワールドファイル
	'.mtl'
].join(',');

export interface ClickedLayerFeaturesData {
	layerEntry: GeoDataEntry;
	feature: MapGeoJSONFeature;
	featureId: string | number;
}

export interface PoiHighlightMarkerState {
	type: 'poi';
	featureId: string | number;
	point: [number, number];
	properties: { [key: string]: any };
	iconImage?: string | null;
}

export interface SearchHighlightMarkerState {
	type: 'search';
	result: ResultPoiData | ResultAddressData | ResultCoordinateData;
}

export type HighlightMarkerState = PoiHighlightMarkerState | SearchHighlightMarkerState;
