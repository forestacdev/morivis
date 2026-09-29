import type { MorivisLayerEntry } from '$routes/map/data/types';
import type {
	ResultAddressData,
	ResultCoordinateData,
	ResultPoiData
} from '$routes/map/utils/data/search-result';
import type { FormatDefinition } from '$routes/map/utils/formats/format-definition';
import { FORMAT_DEFINITIONS, type FormatId } from '$routes/map/utils/formats/registry';
import type { MapGeoJSONFeature, PositionAnchor } from '$routes/map/utils/maplibre';
import { geojson } from 'flatgeobuf';
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
	| 'video'
	| 'vector'
	| 'tileurltype'
	| 'shp'
	| 'gpx'
	| 'tcx'
	| 'fit'
	| 'osm'
	| 'georss'
	| 'geojson'
	| 'wkt'
	| 'geotiff'
	| 'ascii-grid'
	| 'hgt'
	| 'envi-bil'
	| 'jpeg2000'
	| 'wmts'
	| 'wcs'
	| 'geozarr'
	| 'featureservice'
	| 'wfs'
	| 'ogcapifeatures'
	| 'dm'
	| 'drm'
	| 'dwg'
	| 'dxf'
	| 'dgn'
	| 'jww'
	| 'cedxm'
	| 'sxf'
	| 'sima'
	| 'hdf5'
	| 'csv'
	| 'tsv'
	| 'xlsx'
	| 'pptx'
	| 'docx'
	| 'gpkg'
	| 'sqlite'
	| 'filegdb'
	| 'gdb'
	| 'bds'
	| 'gcd'
	| 'mfjson'
	| '3dtiles'
	| 'local-3dtiles'
	| 'local-mvt'
	| 'local-mlt'
	| 'local-raster-tiles'
	| 'pmtiles'
	| 'model'
	| 'step-iges'
	| 'mca'
	| 'roblox'
	| 'gaussian-splat'
	| 'arcgis'
	| 'pointcloud'
	| 'mbtiles'
	| 'netcdf'
	| 'demxml'
	| 'grib2'
	| 'gml'
	| 'citygml'
	| 'cityjson'
	| 'kml'
	| 'topojson'
	| 'landxml'
	| 'stac'
	| 'svg'
	| 'geoparquet'
	| 'geoarrow'
	| 'mif'
	| 'mapinfo-tab'
	| 'geopdf'
	| 'mojxml'
	| 'geophoto'
	| 'locationhistory'
	| 'gtfs'
	| 'hrit'
	| 'bcf'
	| null;

export interface UploadFormatPresentation {
	id: FormatId;
	label: string;
	description: string;
	icon: string;
	/** falseの場合は共用フォームの説明に含め、フォーム一覧へ単独表示しない。 */
	showInFormList?: boolean;
	/** 指定がない形式は、拡張子で絞り込んだファイル選択を開く。 */
	dialogType?: Exclude<DialogType, null>;
}

export interface UploadFormat extends UploadFormatPresentation {
	extensions: string[];
}

export type SupportedFileGroup = UploadFormat;

export type UploadFiles = File[] | null;
export type UploadFilesInput = UploadFiles | File | FileList | null;

/** 対応形式の表示情報と入力先。形式一覧・ファイル選択はこの定義から生成する。 */
const UPLOAD_FORMAT_PRESENTATIONS: UploadFormatPresentation[] = [
	{
		id: 'raster',
		dialogType: 'raster',
		label: 'ラスタータイル',
		description: '画像や標高のタイルデータです。URL入力またはフォルダ・ZIPから登録できます。',
		icon: 'mdi:map-outline'
	},
	{
		id: 'vector',
		dialogType: 'vector',
		label: 'ベクタータイル',
		description:
			'属性を持つベクタータイルです。URL入力またはMVT・MLTのフォルダ・ZIPから登録できます。',
		icon: 'mdi:vector-polygon'
	},
	{
		id: 'wmts',
		dialogType: 'wmts',
		label: 'WMS/WMTS',
		description:
			'地図配信サービスのURLです。公開されている配信レイヤーを追加するときに使います。',
		icon: 'mdi:layers-outline'
	},
	{
		id: 'wcs',
		dialogType: 'wcs',
		label: 'WCS',
		description:
			'カバレッジ配信サービスのURLです。ラスターデータを範囲指定で取得するときに使います。',
		icon: 'mdi:chart-areaspline'
	},
	{
		id: 'featureservice',
		dialogType: 'featureservice',
		label: 'WFS / OGC API',
		description:
			'地物配信サービスのURLです。WFS と OGC API - Features のどちらも同じフォームから開けます。',
		icon: 'mdi:map-marker-path'
	},
	{
		id: 'arcgis',
		dialogType: 'arcgis',
		label: 'ArcGIS',
		description:
			'ArcGIS REST サービスのURLです。ArcGIS Server や Online のレイヤーを追加するときに使います。',
		icon: 'simple-icons:arcgis'
	},
	{
		id: 'pmtiles',
		dialogType: 'pmtiles',
		label: 'PMTiles',
		description:
			'タイルを単一ファイルにまとめたデータです。URL入力またはローカルファイルから登録できます。',
		icon: 'mdi:package-variant-closed'
	},
	{
		id: 'mbtiles',
		dialogType: 'mbtiles',
		label: 'MBTiles',
		description:
			'タイルをSQLiteファイルにまとめたデータです。URL入力またはローカルファイルから登録できます。',
		icon: 'mdi:package-variant-closed'
	},
	{
		id: '3dtiles',
		dialogType: '3dtiles',
		label: '3D Tiles',
		description:
			'3次元の地物やモデルをタイルに分割したデータです。URL入力またはフォルダ・ZIPから登録できます。',
		icon: 'mdi:cube-scan'
	},
	{
		id: 'stac',
		dialogType: 'stac',
		label: 'STAC / COG',
		description:
			'STAC API や COG のURLです。衛星画像やラスターデータを参照するときに使います。',
		icon: 'hugeicons:cloud-cog'
	},
	{
		id: 'geojson',
		dialogType: 'geojson',
		label: 'GeoJSON',
		description:
			'GeoJSON・GeoJSONSeq（行区切りGeoJSON）に対応しています。ファイルの読み込みやテキストの直接入力ができます。',
		icon: 'mdi:code-json'
	},
	{
		id: 'geojsonseq',
		dialogType: 'geojson',
		showInFormList: false,
		label: 'GeoJSONSeq / 行区切りGeoJSON',
		description:
			'GeoJSONを改行またはレコード区切りで並べたデータです。地物と属性をまとめて地図上に表示できます。',
		icon: 'mdi:code-json'
	},
	{
		id: 'wkt',
		dialogType: 'wkt',
		label: 'WKT',
		description: 'WKTファイルの読み込みや、WKTテキストの直接入力を行うフォームです。',
		icon: 'mdi:code-tags'
	},
	{
		id: 'topojson',
		label: 'TopoJSON',
		icon: 'mdi:vector-polyline',
		description:
			'トポロジを共有して持つJSON形式のベクターデータです。境界を共有する地物を軽量に扱うときに使います。'
	},
	{
		id: 'fgb',
		label: 'FlatGeobuf',
		icon: 'mdi:vector-square',
		description:
			'空間インデックスを持つバイナリのベクターデータです。大量の地物をまとめて読み込むときに使います。'
	},
	{
		id: 'parquet',
		label: 'GeoParquet',
		icon: 'mdi:table-large',
		description:
			'Parquet上に地理情報を持たせた列指向データです。大規模な空間テーブルを読み込むときに使います。'
	},
	{
		id: 'geoarrow',
		label: 'GeoArrow / Feather',
		icon: 'mdi:arrow-right-bold-hexagon-outline',
		description:
			'Apache Arrow系の列指向ベクターデータです。メモリ効率を保って地物や属性を扱うときに使います。'
	},
	{
		id: 'mapinfo-tab',
		label: 'MapInfo TAB',
		icon: 'mdi:vector-polygon',
		description:
			'図形・属性・座標系を持つMapInfoのベクターデータです。TABとDAT・MAP・IDをまとめて読み込み、地図上に表示できます。'
	},
	{
		id: 'mif',
		label: 'MapInfo MIF/MID',
		icon: 'mdi:map-marker-radius',
		description: 'MapInfoの交換用ベクターデータです。図形と属性を組で読み込むときに使います。'
	},
	{
		id: 'bds',
		dialogType: 'bds',
		label: 'SIS BDS',
		icon: 'mdi:vector-polyline',
		description: 'SIS形式の地図データです。線・境界線・文字位置と属性を読み込みます。'
	},
	{
		id: 'gcd',
		dialogType: 'gcd',
		label: 'GeoCloud / GeoConic GCD',
		icon: 'mdi:vector-polyline',
		description: 'GCD形式の地図データです。図形の境界線と属性を読み込みます。'
	},
	{
		id: 'gpkg',
		label: 'GeoPackage',
		icon: 'mdi:database',
		description:
			'SQLiteベースの地理空間データです。複数レイヤーをまとめて持つファイルを読み込むときに使います。'
	},
	{
		id: 'sqlite',
		label: 'SQLite / SQL dump',
		icon: 'mdi:database-outline',
		description:
			'SQLiteデータベースや SQL ダンプです。空間カラムや座標列を持つテーブルを読み込むときに使います。'
	},
	{
		id: 'filegdb',
		label: 'Esri FileGDB',
		icon: 'mdi:database-cog',
		description:
			'複数テーブルで構成されたファイル型の地理データベースです。.gdb フォルダ内の構成ファイルをまとめて読み込むときに使います。'
	},
	{
		id: 'shp',
		label: 'Shapefile',
		icon: 'mdi:shape-outline',
		description:
			'複数ファイルで構成されたベクターデータです。`.shp` を中心に図形と属性をまとめて読み込むときに使います。'
	},
	{
		id: 'gpx',
		label: 'GPX',
		icon: 'mdi:map-marker-path',
		description:
			'GPSの移動軌跡やウェイポイントのデータです。登山や走行ログを地図に載せるときに使います。'
	},
	{
		id: 'tcx',
		label: 'TCX',
		icon: 'mdi:run',
		description:
			'トレーニング記録をXMLで表したデータです。運動履歴の軌跡や計測点を表示するときに使います。'
	},
	{
		id: 'fit',
		label: 'FIT',
		icon: 'mdi:run',
		description:
			'GPS機器の移動軌跡や計測値を記録したデータです。経路や時刻・標高・センサー値を地図上で確認するときに使います。'
	},
	{
		id: 'gdb',
		label: 'Garmin GDB',
		icon: 'cib:garmin',
		description:
			'Garminの地図・GPSデータベースです。ルートやトラック、ウェイポイントを読み込むときに使います。'
	},
	{
		id: 'osm',
		label: 'OpenStreetMap XML / PBF',
		icon: 'simple-icons:openstreetmap',
		description:
			'OpenStreetMapのXML・PBF形式データです。ノード・ウェイ・リレーションを地図上に表示できます。'
	},
	{
		id: 'georss',
		label: 'GeoRSS',
		icon: 'mdi:rss',
		description:
			'位置情報付きのRSS / Atomフィードです。配信フィードの点・線・面を地図に載せるときに使います。'
	},
	{
		id: 'sfc',
		label: 'SXF (SFC)',
		icon: 'mdi:ruler-square-compass',
		description:
			'SXF の SFC 形式で保存されたCAD図面です。公共図面や土木図面の線や文字を読み込むときに使います。'
	},
	{
		id: 'gml',
		label: 'GML',
		icon: 'mdi:file-code-outline',
		description:
			'地理情報をXMLで表現するベクターデータです。基盤地図情報や各種XML地図データを読み込むときに使います。'
	},
	{
		id: 'cityjson',
		label: 'CityJSON',
		icon: 'mdi:file-outline',
		description:
			'都市モデルの形状と属性をJSONで表したデータです。建物や地形などの面・立体形状を3D表示するときに使います。'
	},
	{
		id: 'citygml',
		label: 'CityGML',
		icon: 'mdi:file-outline',
		description:
			'都市モデルの形状と属性をXMLで表したデータです。建物を標高付きGeoJSONに変換して3D表示するときに使います。'
	},
	{
		id: 'kml',
		label: 'KML / KMZ',
		icon: 'mdi:earth',
		description:
			'地理データをXMLや圧縮パッケージで表した形式です。地物やスタイル、写真オーバーレイを読み込むときに使います。'
	},
	{
		id: 'csv',
		label: 'CSV',
		icon: 'mdi:table',
		description:
			'表形式のテキストデータです。座標列を指定して地点データとして読み込むときに使います。'
	},
	{
		id: 'tsv',
		label: 'TSV',
		icon: 'mdi:table',
		description:
			'タブ区切りの表形式データです。座標列を指定して地点データとして読み込むときに使います。'
	},
	{
		id: 'xlsx',
		label: 'Excel',
		icon: 'mdi:microsoft-excel',
		description:
			'Excelの表やオートシェイプによる図面です。座標列から地点を読み込むか、図形を取り出して地図上で位置合わせできます。'
	},
	{
		id: 'pptx',
		label: 'PowerPoint',
		icon: 'mdi:microsoft-powerpoint',
		description:
			'PowerPointの図形・文字・埋め込み画像です。スライド内の図面を取り出して地図上で位置合わせできます。'
	},
	{
		id: 'docx',
		label: 'Word',
		icon: 'mdi:microsoft-word',
		description:
			'Wordの図形・文字・埋め込み画像です。同じ段落に配置された図面を取り出して地図上で位置合わせできます。'
	},
	{
		id: 'tif',
		label: 'GeoTIFF',
		icon: 'mdi:image',
		description:
			'位置情報を持つラスターデータです。空中写真や標高などの格子データを表示するときに使います。'
	},
	{
		id: 'jpeg2000',
		label: 'JPEG2000／GeoJP2',
		icon: 'mdi:image',
		description:
			'JPEG2000形式のラスター画像です。埋め込み座標情報や付属ファイルを使い、地図上に表示できます。'
	},
	{
		id: 'envi-bil',
		label: 'ENVI／ESRI BIL',
		icon: 'mdi:image',
		description:
			'HDRと画像本体で構成されるラスターデータです。BIL・BIP・BSQの標高や多バンド画像を地図上に表示できます。'
	},
	{
		id: 'ascii-grid',
		label: 'ASCII Grid',
		icon: 'mdi:grid',
		description:
			'標高や解析値を格子状に記録したテキスト形式です。ASCと同名のPRJを読み込んでラスターや3Dメッシュとして表示できます。'
	},
	{
		id: 'hgt',
		label: 'SRTM HGT',
		icon: 'mdi:terrain',
		description:
			'標高を16ビットの格子で記録したバイナリ形式です。ファイル名の緯度経度を使い、ラスターや3Dメッシュとして表示できます。'
	},
	{
		id: 'h5',
		label: 'HDF5',
		icon: 'mdi:file-tree-outline',
		description:
			'階層構造を持つ科学技術データです。観測値や配列データを含むファイルを開くときに使います。'
	},
	{
		id: 'nc',
		label: 'NetCDF',
		icon: 'mdi:weather-cloudy',
		description:
			'時空間の格子データを扱う科学技術データです。気象や海洋の多次元データを表示するときに使います。'
	},
	{
		id: 'grib2',
		label: 'GRIB2 (GPV)',
		icon: 'mdi:weather-windy',
		description:
			'気象格子データの配信形式です。予報値や解析値を地図上で確認するときに使います。'
	},
	{
		id: 'zip',
		label: 'GTFS',
		icon: 'mdi:train',
		description:
			'公共交通の停留所や路線、時刻表のデータです。交通ネットワークや運行情報を地図化するときに使います。'
	},
	{
		id: 'bz2',
		label: 'HRIT/LRIT',
		icon: 'mdi:satellite-variant',
		description:
			'気象衛星のHRIT/LRIT配信画像です。静止気象衛星の観測画像をラスターとして読み込むときに使います。'
	},
	{
		id: 'dxf',
		label: 'DXF / DWG',
		icon: 'mdi:vector-square',
		description: 'CAD図面を表す形式です。図面上の線や注記を地図上で確認するときに使います。'
	},
	{
		id: 'dgn',
		label: 'MicroStation DGN V7',
		icon: 'mdi:vector-square',
		description:
			'MicroStation V7のCAD図面です。線・面・文字位置を2Dで読み込み、座標系の指定や位置合わせで地図上に配置します。'
	},
	{
		id: 'jww',
		label: 'Jw_cad (JWW / JWC)',
		icon: 'mdi:file-outline',
		description: 'Jw_cadの図面データです。線・文字・塗りつぶしを地図上に配置して利用します。'
	},
	{
		id: 'cedxm',
		label: 'CEDXM',
		icon: 'mdi:file-outline',
		description:
			'木造建築の部材・間取りのXMLデータです。建物の簡易3Dモデルや2D図面を地図上に配置して利用します。'
	},
	{
		id: 'sim',
		label: 'SIMA',
		icon: 'mdi:ruler-square-compass',
		description:
			'測量データ交換のテキスト形式です。座標や観測成果をベクターデータとして読み込むときに使います。'
	},
	{
		id: 'mt',
		label: 'DRM',
		icon: 'mdi:road-variant',
		description:
			'道路ネットワークを表現したデータです。道路リンクや関連属性を読み込むときに使います。'
	},
	{
		id: 'dm',
		label: 'DM',
		icon: 'mdi:terrain',
		description:
			'数値地形図を表現した測量データです。地形図由来の地物を読み込むときに使います。'
	},
	{
		id: 'landxml',
		label: 'LandXML',
		icon: 'mdi:terrain',
		description:
			'土木測量や設計の地形情報を表すXML形式です。TINや線形、測点データを扱うときに使います。'
	},
	{
		id: 'mojxml',
		label: '法務局地図XML',
		icon: 'mdi:map-legend',
		description:
			'登記所備付地図のXMLデータです。筆界や地番を含む地籍情報を表示するときに使います。'
	},
	{
		id: 'geophoto',
		label: '画像 (EXIF GPS)',
		icon: 'mdi:image',
		description:
			'撮影位置をEXIFに持つ写真画像です。位置付き写真を地点として地図に載せるときに使います。'
	},
	{
		id: 'video',
		dialogType: 'video',
		label: '動画',
		description: '動画ファイルです。位置合わせして地図上で再生します。',
		icon: 'mdi:video-outline'
	},
	{
		id: 'svg',
		label: 'SVG',
		icon: 'mdi:svg',
		description: 'ベクター図形をXMLで記述した画像形式です。'
	},
	{
		id: 'pdf',
		label: 'GeoPDF',
		icon: 'mdi:file-pdf-box',
		description:
			'位置情報を持つPDF地図です。紙地図由来のラスタやベクターを読み込むときに使います。'
	},
	{
		id: 'pointcloud',
		label: '点群',
		icon: 'mdi:chart-scatter-plot',
		description: '多数の座標点で構成された3Dデータです。'
	},
	{
		id: 'spz',
		dialogType: 'gaussian-splat',
		label: '3D Gaussian Splatting (SPZ)',
		icon: 'mdi:chart-scatter-plot',
		description: '3D Gaussian Splattingを圧縮したデータです。地図上に配置して表示します。'
	},
	{
		id: 'glb',
		label: 'GLB / GLTF',
		icon: 'file-icons:gltf',
		description: '3Dモデルの形状、材質、テクスチャ、アニメーションなどを記録するファイルです。'
	},
	{
		id: 'usd',
		label: 'USD / USDZ',
		icon: 'mdi:package-variant-closed',
		description:
			'Pixar USDの3Dシーン形式です。USDZアーカイブ、テキスト形式のUSD/USDA、バイナリ形式のUSDCモデルを読み込みます。'
	},
	{
		id: 'obj',
		label: 'Wavefront OBJ',
		icon: 'mdi:cube-outline',
		description: '3Dメッシュの交換形式です。建物や地形のモデル形状を読み込むときに使います。'
	},
	{
		id: '3ds',
		label: 'Autodesk 3DS',
		icon: 'mdi:cube-outline',
		description: '3D Studio系の3Dモデル形式です。既存の3D資産を地図上で確認するときに使います。'
	},
	{
		id: 'rik',
		label: 'RIKCAD RIK（3DS）',
		icon: 'mdi:home-city-outline',
		description:
			'3DSモデルとテクスチャを格納したRIKCAD連携ファイルです。建物などを3Dモデルとして地図上に配置するときに使います。'
	},
	{
		id: 'dae',
		label: 'Collada DAE',
		icon: 'mdi:vector-combine',
		description: 'XMLベースの3Dモデル形式です。モデルと構造情報を読み込むときに使います。'
	},
	{
		id: '3dm',
		label: 'Rhino 3DM',
		icon: 'mdi:alpha-r-box-outline',
		description: 'Rhinocerosの3Dモデル形式です。設計モデルをそのまま持ち込むときに使います。'
	},
	{
		id: 'vrml',
		label: 'VRML 2.0',
		icon: 'mdi:cube-outline',
		description:
			'形状や材質を記述する3Dモデル形式です。外部画像を含むモデルを地図上に表示するときに使います。'
	},
	{
		id: 'fbx',
		label: 'Autodesk FBX',
		icon: 'mdi:cube-outline',
		description:
			'3Dシーンやメッシュを保持する交換形式です。外部ツールで作成した3D資産を読み込むときに使います。'
	},
	{
		id: 'drc',
		label: 'Draco DRC',
		icon: 'mdi:cube-outline',
		description: '圧縮された3Dメッシュ形式です。軽量化された3D形状を表示するときに使います。'
	},
	{
		id: '3mf',
		label: '3D Manufacturing Format',
		icon: 'mdi:printer-3d',
		description: '3D製造向けのモデル形式です。色や材質を含む3D形状を扱うときに使います。'
	},
	{
		id: 'amf',
		label: 'Additive Manufacturing Format',
		icon: 'mdi:printer-3d',
		description: '積層造形向けの3Dモデル形式です。造形用の3Dデータを確認するときに使います。'
	},
	{
		id: 'step-iges',
		label: 'STEP / IGES',
		icon: 'mdi:cube-outline',
		description:
			'CADの立体・曲面を保持する交換形式です。部材や設備の形状・色を3Dモデルとして読み込むときに使います。'
	},
	{
		id: 'stl',
		label: 'STL',
		icon: 'mdi:cube-outline',
		description:
			'三角形メッシュで形状を表す3Dモデル形式です。ASCII形式とバイナリ形式の造形データを読み込むときに使います。'
	},
	{
		id: 'ifc',
		label: 'Industry Foundation Classes',
		icon: 'mdi:office-building-cog',
		description:
			'BIMで使う建築モデル形式です。建物の部材や属性を含む3Dデータを読み込むときに使います。'
	},
	{
		id: 'bcf',
		label: 'BIM Collaboration Format',
		icon: 'mdi:comment-question-outline',
		description:
			'IFCモデルに対する課題、コメント、視点を共有するBIM協議ファイルです。読み込み済みIFCの対象部材を確認するときに使います。'
	},
	{
		id: 'vrm',
		label: 'VRM',
		icon: 'mdi:human',
		description:
			'人型アバターのモデル形式です。表情、骨格、揺れ物などを持つVRMモデルを読み込むときに使います。'
	},
	{
		id: 'pmx',
		label: 'MikuMikuDance PMX',
		icon: 'mdi:human',
		description:
			'MikuMikuDanceで使う3Dモデル形式です。キャラクターなどのスキニング済みモデルを読み込むときに使います。'
	},
	{
		id: 'mca',
		dialogType: 'mca',
		label: 'Minecraft Java (.mca)',
		icon: 'mdi:minecraft',
		description: 'Minecraft Java版の地形リージョンデータです。'
	},
	{
		id: 'roblox',
		dialogType: 'roblox',
		label: 'Roblox (.rbxl / .rbxlx)',
		icon: 'simple-icons:roblox',
		description: 'Robloxのワールドデータです。基本パーツを3Dモデルとして地図に配置します。'
	}
];

export const SUPPORTED_UPLOAD_FORMATS: UploadFormat[] = UPLOAD_FORMAT_PRESENTATIONS.map(format => ({
	...format,
	extensions: [...FORMAT_DEFINITIONS[format.id].extensions]
}));

/** フォーム一覧の入口。共用フォームへ集約した形式もファイル判定には残す。 */
export const UPLOAD_FORM_FORMATS = SUPPORTED_UPLOAD_FORMATS.filter(
	format => format.showInFormList !== false
);

/** ローカルファイルを受け付ける形式。 */
export const SUPPORTED_FILE_GROUPS: SupportedFileGroup[] = SUPPORTED_UPLOAD_FORMATS.filter(
	(format) => format.extensions.length > 0
);

/** SUPPORTED_FILE_GROUPS から自動生成 */
export const SUPPORTED_FILE_EXTENSIONS = SUPPORTED_FILE_GROUPS.flatMap((g) => g.extensions);

/** input[accept] 用（主要ファイル + 補助ファイルも受け入れる） */
export const SUPPORTED_FILE_ACCEPT = [
	...new Set([
		...SUPPORTED_FILE_EXTENSIONS,
		...Object.values(FORMAT_DEFINITIONS).flatMap((format: FormatDefinition) =>
			format.files?.optionalExtensions ?? []
		)
	])
].join(',');

export interface ClickedLayerFeaturesData {
	layerEntry: MorivisLayerEntry;
	feature: MapGeoJSONFeature;
	featureId: string | number;
}

export interface PoiIconMarkerAppearance {
	width: number;
	height: number;
	anchor: PositionAnchor;
	offset: [number, number];
	rotation: number;
	rotationAlignment: 'map' | 'viewport';
	pitchAlignment: 'map' | 'viewport';
	opacity: number;
}

export interface PoiHighlightMarkerState {
	type: 'poi';
	featureId: string | number;
	point: [number, number];
	properties: { [key: string]: any; };
	iconImage?: string | null;
	iconMarker?: PoiIconMarkerAppearance;
}

export interface SearchHighlightMarkerState {
	type: 'search';
	result: ResultPoiData | ResultAddressData | ResultCoordinateData;
}

export type HighlightMarkerState = PoiHighlightMarkerState | SearchHighlightMarkerState;
