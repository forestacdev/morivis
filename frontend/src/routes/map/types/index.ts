import type { MorivisLayerEntry } from '$routes/map/data/types';
import type {
	ResultAddressData,
	ResultCoordinateData,
	ResultPoiData
} from '$routes/map/utils/data/search-result';
import { geojson } from 'flatgeobuf';
import type { MapGeoJSONFeature } from 'maplibre-gl';
export type {
	FeatureMenuData,
	FeaturePanelAudioMedia,
	FeaturePanelData,
	FeaturePanelImageMedia,
	FeaturePanelImageSource,
	FeaturePanelMedia,
	FeaturePanelSummary,
	FeaturePanelVideoMedia,
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
	| 'wkt'
	| 'geotiff'
	| 'wmts'
	| 'wcs'
	| 'geozarr'
	| 'featureservice'
	| 'wfs'
	| 'ogcapifeatures'
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
	| 'geoparquet'
	| 'geoarrow'
	| 'mif'
	| 'geopdf'
	| 'mojxml'
	| 'geophoto'
	| 'locationhistory'
	| 'gtfs'
	| 'hrit'
	| null;

export interface SupportedFileGroup {
	label: string;
	description: string;
	extensions: string[];
}

/** ファイル拡張子のグループ分け（UI表示用） */
export const SUPPORTED_FILE_GROUPS: SupportedFileGroup[] = [
	{
		label: 'GeoJSON',
		description:
			'地物をJSONで記述したベクターデータです。属性付きの点・線・面を読み込むときに使います。',
		extensions: ['.geojson', '.json']
	},
	{
		label: 'WKT',
		description:
			'Well-Known Text 形式のベクターデータです。点・線・面のジオメトリをテキストで持ち込むときに使います。',
		extensions: ['.wkt', '.ewkt']
	},
	{
		label: 'TopoJSON',
		description:
			'トポロジを共有して持つJSON形式のベクターデータです。境界を共有する地物を軽量に扱うときに使います。',
		extensions: ['.topojson']
	},
	{
		label: 'FlatGeobuf',
		description:
			'空間インデックスを持つバイナリのベクターデータです。大きめのGeoJSON系データを扱うときに使います。',
		extensions: ['.fgb']
	},
	{
		label: 'GeoParquet',
		description:
			'Parquet上に地理情報を持たせた列指向データです。大規模な空間テーブルを読み込むときに使います。',
		extensions: ['.parquet', '.geoparquet']
	},
	{
		label: 'GeoArrow / Feather',
		description:
			'Apache Arrow系の列指向ベクターデータです。メモリ効率を保って地物や属性を扱うときに使います。',
		extensions: ['.arrow', '.feather']
	},
	{
		label: 'MapInfo MIF/MID',
		description: 'MapInfoの交換用ベクターデータです。図形と属性を組で読み込むときに使います。',
		extensions: ['.mif', '.mid']
	},
	{
		label: 'GeoPackage',
		description:
			'SQLiteベースの地理空間データです。複数レイヤーをまとめて持つファイルを読み込むときに使います。',
		extensions: ['.gpkg']
	},
	{
		label: 'Shapefile',
		description:
			'ESRIが策定した複数ファイル構成のベクターデータです。`.shp` を中心に図形と属性をまとめて読み込むときに使います。',
		extensions: ['.shp', '.dbf', '.shx', '.prj', '.cpg']
	},
	{
		label: 'GPX',
		description:
			'GPSの移動軌跡やウェイポイントのデータです。登山や走行ログを地図に載せるときに使います。',
		extensions: ['.gpx']
	},
	{
		label: 'TCX',
		description:
			'Garmin系のトレーニングログデータです。運動履歴の軌跡や計測点を表示するときに使います。',
		extensions: ['.tcx']
	},
	{
		label: 'Garmin GDB',
		description:
			'Garminの地図・GPSデータベースです。ルートやトラック、ウェイポイントを読み込むときに使います。',
		extensions: ['.gdb']
	},
	{
		label: 'OpenStreetMap XML',
		description:
			'OpenStreetMapのXML形式データです。OSMのノードやウェイ、リレーションを読み込むときに使います。',
		extensions: ['.osm']
	},
	{
		label: 'GML',
		description:
			'地理情報をXMLで表現するベクターデータです。基盤地図情報や各種XML地図データを読み込むときに使います。',
		extensions: ['.gml', '.xml']
	},
	{
		label: 'KML / KMZ',
		description:
			'Google Earth系の地理データです。地物やスタイル、写真オーバーレイを読み込むときに使います。',
		extensions: ['.kml', '.kmz']
	},
	{
		label: 'CSV',
		description:
			'表形式のテキストデータです。座標列を指定して地点データとして読み込むときに使います。',
		extensions: ['.csv']
	},
	{
		label: 'TSV',
		description:
			'タブ区切りの表形式データです。座標列を指定して地点データとして読み込むときに使います。',
		extensions: ['.tsv']
	},
	{
		label: 'GeoTIFF',
		description:
			'位置情報を持つラスターデータです。空中写真や標高などの格子データを表示するときに使います。',
		extensions: ['.tif', '.tiff']
	},
	{
		label: 'MBTiles',
		description:
			'SQLiteにまとめたタイルデータです。配布済みの地図タイルを単一ファイルで読み込むときに使います。',
		extensions: ['.mbtiles']
	},
	{
		label: 'PMTiles',
		description:
			'単一ファイルにまとめたクラウド向けタイルデータです。静的ホスティングされたタイルを扱うときに使います。',
		extensions: ['.pmtiles']
	},
	{
		label: 'HDF5',
		description:
			'階層構造を持つ科学技術データです。観測値や配列データを含むファイルを開くときに使います。',
		extensions: ['.h5']
	},
	{
		label: 'NetCDF',
		description:
			'時空間の格子データを扱う科学技術データです。気象や海洋の多次元データを表示するときに使います。',
		extensions: ['.nc', '.nc4']
	},
	{
		label: 'GRIB2 (GPV)',
		description:
			'気象格子データの配信形式です。予報値や解析値を地図上で確認するときに使います。',
		extensions: ['.grib2', '.grb2', '.grb', '.bin']
	},
	{
		label: 'GTFS',
		description:
			'公共交通の停留所や路線、時刻表のデータです。交通ネットワークや運行情報を地図化するときに使います。',
		extensions: ['.zip']
	},
	{
		label: 'HRIT/LRIT',
		description:
			'気象衛星のHRIT/LRIT配信画像です。静止気象衛星の観測画像をラスターとして読み込むときに使います。',
		extensions: ['.bz2', '.lrit', '.hrit']
	},
	{
		label: 'DXF',
		description: 'CAD図面の交換形式です。図面上の線や注記を地図上で確認するときに使います。',
		extensions: ['.dxf']
	},
	{
		label: 'SIMA',
		description:
			'測量データ交換のテキスト形式です。座標や観測成果をベクターデータとして読み込むときに使います。',
		extensions: ['.sim']
	},
	{
		label: 'DM',
		description:
			'公共測量の計画機関において作成された数値地形図データです。数値地図系の地物を読み込むときに使います。',
		extensions: ['.dm']
	},
	{
		label: 'LandXML',
		description: '土木測量や設計で使うXML形式です。TINや線形、測点データを扱うときに使います。',
		extensions: ['.landxml']
	},
	{
		label: '法務局地図XML',
		description:
			'登記所備付地図のXMLデータです。筆界や地番を含む地籍情報を表示するときに使います。',
		extensions: ['.xml']
	},
	{
		label: '画像 (EXIF GPS)',
		description:
			'撮影位置をEXIFに持つ写真画像です。位置付き写真を地点として地図に載せるときに使います。',
		extensions: ['.png', '.jpg', '.jpeg', '.webp']
	},
	{
		label: 'GeoPDF',
		description:
			'位置情報を持つPDF地図です。紙地図由来のラスタやベクターを読み込むときに使います。',
		extensions: ['.pdf']
	},
	{
		label: 'GLB',
		description: 'glTFのバイナリ3Dモデルです。3D形状を地図上に配置して表示するときに使います。',
		extensions: ['.glb']
	},
	{
		label: 'Wavefront OBJ',
		description: '3Dメッシュの交換形式です。建物や地形のモデル形状を読み込むときに使います。',
		extensions: ['.obj']
	},
	{
		label: 'Autodesk 3DS',
		description:
			'3D Studio系の3Dモデル形式です。既存の3D資産を地図上で確認するときに使います。',
		extensions: ['.3ds']
	},
	{
		label: 'Collada DAE',
		description: 'XMLベースの3Dモデル形式です。モデルと構造情報を読み込むときに使います。',
		extensions: ['.dae']
	},
	{
		label: 'Rhino 3DM',
		description: 'Rhinocerosの3Dモデル形式です。設計モデルをそのまま持ち込むときに使います。',
		extensions: ['.3dm']
	},
	{
		label: 'Autodesk FBX',
		description:
			'3Dシーンやメッシュを保持する交換形式です。外部ツールで作成した3D資産を読み込むときに使います。',
		extensions: ['.fbx']
	},
	{
		label: 'Draco DRC',
		description: '圧縮された3Dメッシュ形式です。軽量化された3D形状を表示するときに使います。',
		extensions: ['.drc']
	},
	{
		label: '3D Manufacturing Format',
		description: '3D製造向けのモデル形式です。色や材質を含む3D形状を扱うときに使います。',
		extensions: ['.3mf']
	},
	{
		label: 'Additive Manufacturing Format',
		description: '積層造形向けの3Dモデル形式です。造形用の3Dデータを確認するときに使います。',
		extensions: ['.amf']
	},
	{
		label: 'Industry Foundation Classes',
		description:
			'BIMで使う建築モデル形式です。建物の部材や属性を含む3Dデータを読み込むときに使います。',
		extensions: ['.ifc']
	},
	{
		label: '点群',
		description:
			'多数の座標点で構成された3Dデータです。測量やスキャン由来の点群を表示するときに使います。',
		extensions: ['.las', '.laz', '.ply', '.pcd', '.xyz', '.txt']
	}
];

/** SUPPORTED_FILE_GROUPS から自動生成 */
export const SUPPORTED_FILE_EXTENSIONS = SUPPORTED_FILE_GROUPS.flatMap((g) => g.extensions);

/** input[accept] 用（主要ファイル + 補助ファイルも受け入れる） */
export const SUPPORTED_FILE_ACCEPT = [
	...SUPPORTED_FILE_EXTENSIONS,
	'.tfw',
	'.tifw',
	'.tiffw',
	'.pgw',
	'.jgw',
	'.wld', // ワールドファイル
	'.aux.xml',
	'.mtl'
].join(',');

export interface ClickedLayerFeaturesData {
	layerEntry: MorivisLayerEntry;
	feature: MapGeoJSONFeature;
	featureId: string | number;
}

export interface PoiHighlightMarkerState {
	type: 'poi';
	featureId: string | number;
	point: [number, number];
	properties: { [key: string]: any; };
	iconImage?: string | null;
}

export interface SearchHighlightMarkerState {
	type: 'search';
	result: ResultPoiData | ResultAddressData | ResultCoordinateData;
}

export type HighlightMarkerState = PoiHighlightMarkerState | SearchHighlightMarkerState;
