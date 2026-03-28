# データパイプライン

morivisのデータ入力からレンダリングまでの全体フローを記載する。

## アーキテクチャ概要

```mermaid
graph LR
    subgraph Input["入力"]
        F_GJ[".geojson / .fgb"]
        F_SHP[".shp + .dbf + .shx"]
        F_CSV[".csv"]
        F_GPX[".gpx"]
        F_GML[".gml / .xml (GML)"]
        F_KML[".kml / .kmz"]
        F_TOPO[".topojson"]
        F_DXF[".dxf"]
        F_DM[".dm"]
        F_SIMA[".sim"]
        F_GPKG[".gpkg"]
        F_MOJ[".xml (法務局地図)"]
        F_TIF[".tif / .png / .jpg"]
        F_PMT[".pmtiles"]
        F_MBT[".mbtiles"]
        F_GLB[".glb / .obj"]
        F_PC[".las / .laz / .ply / .pcd / .xyz"]
        F_H5[".h5"]
        F_NC[".nc / .nc4"]
        F_DEM[".xml (基盤地図DEM)"]
        F_GRB[".bin / .grib2 / .grb2"]
        F_LX[".xml / .landxml (LandXML)"]
        F_PHOTO[".jpg (EXIF GPS)"]
        F_ZIP[".zip / フォルダ"]
        U_XYZ["XYZタイルURL"]
        U_WMS["WMTS/WMS URL"]
        U_ARC["ArcGIS URL"]
        U_3DT["3D Tiles URL"]
        U_VEC["ベクタータイルURL"]
        U_STAC["STAC/COG URL"]
    end

    subgraph Parsers["パーサー"]
        P_GJ["geojson.ts"]
        P_SHP["shp.ts"]
        P_CSV["csv.ts"]
        P_GPX["gpx.ts"]
        P_GML["gml.ts"]
        P_KML["kml.ts"]
        P_TOPO["topojson.ts"]
        P_DXF["dxf.ts"]
        P_DM["dm/"]
        P_SIMA["sima.ts"]
        P_GPKG["gpkg.ts (sql.js)"]
        P_MOJ["mojxml.ts (proj4内蔵)"]
        P_TIF["geotiff/ (geotiff.js)"]
        P_NC["netcdfjs"]
        P_DEM["dem-xml/ (Worker x4)"]
        P_GRB["grib2.ts"]
        P_H5["jsfive + スワスリサンプリング"]
        P_LX["landxml.ts (TIN→Workerラスタライズ)"]
        P_STAC["stac.ts → cog-proxy → geotiff.js"]
        P_COG["CogTileManager (Range request)"]
        P_PC["点群パーサー (loaders.gl / xyz.ts)"]
        P_EXIF["exif.ts (exifr)"]
        P_PBF["arcgis-pbf-parser"]
    end

    subgraph ProjTransform["座標変換"]
        PRJ["proj4 Worker並列\n(transformGeoJSONParallel)\n不明→ZoneForm"]
    end

    subgraph TerrariumPipeline["Terrariumパイプライン"]
        TER["Terrarium\nエンコード Worker"]
        CACHE["GeoTiffCache\n(markAs4326)"]
        WEBGL["WebGLシェーダー\n再投影 4326→WebMercator\nカラーマップ適用"]
    end

    subgraph CogPipeline["COGタイルパイプライン"]
        COG_TRI["Triangulation\n(適応的三角形分割)"]
        COG_WGL["WebGL Worker\n(カラーマップ/RGB合成)"]
    end

    subgraph PcTransform["点群座標変換"]
        PCS["proj4 Worker"]
    end

    subgraph Entries["エントリ"]
        VE["VectorEntry"]
        RE["RasterEntry"]
        ME["ModelEntry"]
    end

    subgraph Protocol["カスタムプロトコル"]
        PR1["geojson://"]
        PR2["pmtiles://"]
        PR3["mbtiles://"]
        PR4["esri-feature://"]
        PR5["webgl://"]
        PR6["cog://"]
    end

    subgraph Sources["MapLibreソース"]
        GJS["GeoJSONSource"]
        VTS["VectorSource"]
        RTS["RasterSource"]
        IMS["ImageSource"]
    end

    subgraph Render["レンダリング"]
        ML["MapLibre GL JS"]
        DK["deck.gl"]
        TH["three.js"]
    end

    CV["Map Canvas"]

    %% ベクターパーサー
    F_GJ --> P_GJ
    F_SHP --> P_SHP
    F_CSV --> P_CSV
    F_GPX --> P_GPX
    F_GML --> P_GML
    F_KML --> P_KML
    F_TOPO --> P_TOPO
    F_DXF --> P_DXF
    F_DM --> P_DM
    F_SIMA --> P_SIMA
    F_GPKG --> P_GPKG
    F_MOJ --> P_MOJ
    F_PHOTO --> P_EXIF

    %% ベクター → 座標変換 → エントリ
    P_GJ & P_SHP & P_CSV & P_GPX & P_GML & P_KML & P_TOPO & P_DXF & P_DM & P_SIMA & P_GPKG & P_MOJ & P_EXIF --> PRJ
    PRJ --> VE

    %% ラスターパーサー
    F_TIF --> P_TIF
    F_NC --> P_NC
    F_DEM --> P_DEM
    F_GRB --> P_GRB
    F_H5 --> P_H5
    F_LX --> P_LX
    U_STAC --> P_STAC
    U_STAC --> P_COG

    %% ラスター → Terrarium → エントリ
    P_TIF & P_NC & P_DEM & P_GRB & P_H5 & P_LX & P_STAC --> TER
    TER --> CACHE --> WEBGL --> RE

    %% COGタイル → エントリ
    P_COG --> COG_TRI --> COG_WGL --> RE

    %% タイル系 → エントリ
    F_PMT --> RE
    F_MBT --> RE
    U_XYZ & U_WMS --> RE
    U_ARC --> P_PBF --> RE
    U_VEC --> VE

    %% 3D/点群 → エントリ
    F_GLB --> ME
    U_3DT --> ME
    F_PC --> P_PC --> PCS --> ME

    %% エントリ → プロトコル → ソース
    VE -->|geojson/fgb| GJS
    VE -->|geojsontile| PR1 --> VTS
    VE -->|pmtiles| PR2 --> VTS
    VE -->|mbtiles| PR3 --> VTS
    VE -->|esri-feature| PR4 --> VTS
    RE -->|image/tiff| IMS
    RE -->|pmtiles| PR2 --> RTS
    RE -->|mbtiles| PR3 --> RTS
    RE -->|dem| PR5 --> RTS
    RE -->|cog| PR6 --> RTS

    %% ソース → レンダラー → キャンバス
    GJS & VTS --> ML
    RTS & IMS --> ML
    ME -->|3d-tiles / point-cloud| DK
    ME -->|gltf / obj| TH
    ML & DK & TH --> CV
```

## 対応データ形式一覧

### ベクター（ファイル）

| 形式 | 拡張子 | フォーム | 変換 | format type | ソース | レンダラー |
|---|---|---|---|---|---|---|
| GeoJSON | .geojson | GeoJsonForm | proj4 | geojson | GeoJSONSource | MapLibre |
| FlatGeobuf | .fgb | GeoJsonForm | proj4 | fgb | GeoJSONSource | MapLibre |
| Shapefile | .shp+.dbf+.prj+.shx | ShapeFileForm | proj4 Worker並列 | geojson | GeoJSONSource | MapLibre |
| GeoPackage | .gpkg | GpkgForm | proj4 | geojson | GeoJSONSource | MapLibre |
| GPX | .gpx | GpxForm | - | geojson | GeoJSONSource | MapLibre |
| GML | .gml / .xml | GmlForm | proj4 | geojson | GeoJSONSource | MapLibre |
| KML/KMZ | .kml / .kmz | KmlForm | proj4 | geojson | GeoJSONSource | MapLibre |
| TopoJSON | .topojson | TopoJsonForm | proj4 | geojson | GeoJSONSource | MapLibre |
| CSV | .csv | CsvForm | 緯度経度→Point | geojson | GeoJSONSource | MapLibre |
| DXF | .dxf | DxfForm | proj4 | geojson | GeoJSONSource | MapLibre |
| DM | .dm | DmForm | - | geojson | GeoJSONSource | MapLibre |
| SIMA | .sim | SimaForm | - | geojson | GeoJSONSource | MapLibre |
| 法務局地図XML | .xml | MojXmlForm | proj4 (内蔵) | geojson | GeoJSONSource | MapLibre |
| 位置情報付き写真 | .jpg/.heic | GeoPhotoForm | EXIF GPS (exifr) | geojson | GeoJSONSource | MapLibre |

### ベクター（タイルサービス）

| 形式 | 入力 | フォーム | プロトコル | format type | ソース | レンダラー |
|---|---|---|---|---|---|---|
| PBF (MVT) | URL | VectorForm | - | mvt | VectorSource/tiles | MapLibre |
| GeoJSONタイル | URL | VectorForm | geojson:// | geojsontile | VectorSource/tiles | MapLibre |
| PMTiles (vector) | URL/ファイル | PmtilesForm | pmtiles:// | pmtiles | VectorSource/url | MapLibre |
| MBTiles (vector) | ファイル | MBTilesForm | mbtiles:// | mbtiles | VectorSource/tiles | MapLibre |
| ArcGIS FeatureServer | URL | ArcGisForm | esri-feature:// | esri-feature | VectorSource/tiles | MapLibre |

### ラスター（ファイル）

| 形式 | 拡張子 | フォーム | 変換 | format type | ソース | レンダラー |
|---|---|---|---|---|---|---|
| GeoTIFF | .tif/.tiff | GeoTiffForm | Terrarium Worker | tiff | ImageSource | MapLibre |
| PNG/JPEG + aux.xml | .png/.jpg + .aux.xml | GeoTiffForm | Terrarium Worker | tiff | ImageSource | MapLibre |
| PNG/JPEG + ワールドファイル | .png/.jpg + .pgw/.jgw | GeoTiffForm | Terrarium Worker | tiff | ImageSource | MapLibre |
| NetCDF | .nc/.nc4 | NetCDFForm | netcdfjs + Terrarium Worker | tiff | ImageSource | MapLibre |
| 基盤地図情報 DEM XML | .xml/.zip | DemXmlForm | XML Worker x4 + Terrarium Worker | tiff | ImageSource | MapLibre |
| GRIB2 (GPV) | .bin/.grib2/.grb2 | Grib2Form | GRIB2パーサー + Terrarium Worker | tiff | ImageSource | MapLibre |
| HDF5 | .h5 | Hdf5Form | jsfive + スワスリサンプリング + Terrarium Worker | tiff | ImageSource | MapLibre |
| LandXML | .xml/.landxml | LandXmlForm | TIN→Workerラスタライズ + Terrarium Worker | tiff | ImageSource | MapLibre |

### ラスター（リモート）

| 形式 | 入力 | フォーム | 変換 | format type | ソース | レンダラー |
|---|---|---|---|---|---|---|
| STAC API / COG (小) | URL | StacForm | geotiff.js + Terrarium Worker | tiff | ImageSource | MapLibre |
| STAC API / COG (大) | URL | StacForm | CogTileManager + Triangulation + WebGL Worker | cog | RasterSource (cog://) | MapLibre |
| COG直URL (小) | .tif URL | StacForm | geotiff.js + Terrarium Worker | tiff | ImageSource | MapLibre |
| COG直URL (大) | .tif URL | StacForm | CogTileManager + Triangulation + WebGL Worker | cog | RasterSource (cog://) | MapLibre |

### ラスター（タイルサービス）

| 形式 | 入力 | フォーム | プロトコル | format type | ソース | レンダラー |
|---|---|---|---|---|---|---|
| XYZ画像タイル | URL | RasterForm | - | image | RasterSource/tiles | MapLibre |
| XYZ DEMタイル | URL | RasterForm | webgl:// | image (dem) | RasterSource/tiles | MapLibre |
| WMS/WMTS | URL | WmtsForm | - | image | RasterSource/tiles | MapLibre |
| PMTiles (raster) | URL/ファイル | PmtilesForm | pmtiles:// | pmtiles | RasterSource/url | MapLibre |
| MBTiles (raster) | ファイル | MBTilesForm | mbtiles:// | mbtiles | RasterSource/tiles | MapLibre |
| ArcGIS MapServer | URL | ArcGisForm | - | image | RasterSource/tiles | MapLibre |

### 3Dモデル・点群

| 形式 | 拡張子/入力 | フォーム | 変換 | format type | レンダラー |
|---|---|---|---|---|---|
| GLB/glTF | .glb | MeshModelForm | - | gltf | three.js |
| OBJ (+MTL+テクスチャ) | .obj+.mtl+画像 | MeshModelForm | OBJLoader+MTLLoader | obj | three.js |
| 3D Tiles | URL (tileset.json) | Tiles3DForm | - | 3d-tiles | deck.gl (Tile3DLayer) |
| LAS/LAZ | .las/.laz | PointCloudForm | proj4 Worker | point-cloud | deck.gl (PointCloudLayer) |
| PLY | .ply | PointCloudForm | proj4 Worker | point-cloud | deck.gl (PointCloudLayer) |
| PCD | .pcd | PointCloudForm | proj4 Worker | point-cloud | deck.gl (PointCloudLayer) |
| XYZ点群 | .xyz | PointCloudForm | proj4 Worker | point-cloud | deck.gl (PointCloudLayer) |

## カスタムプロトコル

MapLibreの`addProtocol`を使って、独自のタイル配信プロトコルを実装している。

| プロトコル | 用途 | Worker | ライフサイクル |
|---|---|---|---|
| `geojson://` | GeoJSONタイル化 | protocol_geojson.worker | 動的登録/解除 |
| `pmtiles://` | PMTilesアーカイブ読み込み | - (pmtilesライブラリ) | 常時起動 |
| `mbtiles://` | MBTilesファイル読み込み (sql.js) | - (Wasm) | 動的登録/解除 |
| `esri-feature://` | ArcGIS FeatureServer bbox PBFクエリ | protocol_esri_feature.worker | 動的登録/解除 |
| `webgl://` | DEM標高シェーダー処理 | protocol_dem.worker | 常時起動 |
| `cog://` | COGタイルレンダリング | protocol_cog.worker (x2) | 動的登録/解除 |

## エントリ型システム

```
GeoDataEntry (Union)
├── VectorEntry<MetaData>
│   ├── format.type: geojson | fgb | mvt | pmtiles | mbtiles | geojsontile | esri-feature
│   ├── format.geometryType: Point | LineString | Polygon | Label
│   └── style: PointStyle | LineStyle | PolygonStyle
│       ├── colors: ColorsStyle (single | match | step | linear)
│       ├── numbers: NumbersStyle
│       ├── labels: LabelsStyle
│       └── extrusion / heatmap / pattern
│
├── RasterEntry<Style>
│   ├── format.type: image | pmtiles | mbtiles | cog | tiff
│   └── style: RasterBaseMapStyle | RasterDemStyle | RasterTiffStyle | RasterCadStyle
│       ├── opacity, visible, minZoom, maxZoom
│       └── visualization (DEM: relief/slope/aspect/curvature, Tiff: single/multi band)
│
└── ModelEntry
    ├── ModelMeshEntry<MeshStyle>     → three.js (GLB/OBJ)
    │   └── transform: { lng, lat, altitude, heightOffset, scale, rotationX/Y/Z }
    ├── ModelTiles3DEntry<Style>      → deck.gl (3D Tiles)
    └── ModelPointCloudEntry          → deck.gl (LAS/LAZ/PLY/PCD/XYZ)
```

## スタイル更新フロー

```
リアクティブな値の変更
    ↓
Map.svelte: createMapStyle() でスタイル定義(sources, layers)を再生成
    ↓
setStyleDebounce → mapStore.setStyle()
    ↓
MapLibre GL JS がスタイルを適用・差分更新
```

- `mapStore.setStyle()`を通じてスタイルを変更するのが基本
- `mapStore.setData()`や`mapStore.setFilter()`による命令的な直接操作は避ける
- deck.glレイヤーは`mapStore.setDeckOverlay()`で別途管理
- three.jsレイヤーは`mapStore.setThreeLayer()`で別途管理

## Worker一覧

| Worker | パス | 用途 | ライフサイクル |
|---|---|---|---|
| terrarium_encode | geotiff/terrarium_encode.worker.ts | バンドデータ→Terrarium PNGエンコード | 遅延初期化、エンコード完了後terminate |
| terrarium_render | geotiff/terrarium_render.worker.ts | Terrarium PNG→最終画像レンダリング(WebGL) | 遅延初期化、全TIFFエントリ解放後terminate |
| transformer | proj/transformer.worker.ts | GeoJSON座標変換(並列) | 変換時に起動、完了後terminate |
| pointcloud_transformer | proj/pointcloud_transformer.worker.ts | 点群座標変換 | 変換時に起動、完了後terminate |
| xml-parser | file/dem-xml/xml-parser.worker.ts | 基盤地図DEM XMLパース(4並列) | 解析時に起動、完了後terminate |
| protocol_geojson | protocol/vector/geojson/protocol_geojson.worker.ts | GeoJSON→ベクタータイル化 | 動的登録/解除 |
| protocol_esri_feature | protocol/vector/esri-feature/protocol_esri_feature.worker.ts | ArcGIS PBF→ベクタータイル化 | 動的登録/解除 |
| protocol_dem | protocol/raster/protocol_dem.worker.ts | DEM標高→シェーダー画像 | オンデマンド |
| protocol_cog | protocol/cog/protocol_cog.worker.ts | COGタイル→カラーマップ/RGB合成(WebGL) | 動的登録/解除 (x2 Worker Pool) |
| generation_icon | utils/icon/generation_icon.worker.ts | アイコン画像生成 | 常時起動 |

## レンダラー

| レンダラー | 用途 | 統合方法 |
|---|---|---|
| **MapLibre GL JS** | ラスター・ベクター地図の描画 | メインの地図エンジン |
| **deck.gl** | 3D Tiles・点群の描画 | `MapboxOverlay`としてMapLibreに追加 |
| **three.js** | GLB/OBJメッシュモデルの描画 | カスタムレイヤーとしてMapLibreに追加 |
