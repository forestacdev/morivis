# データパイプライン

morivis では、アップロードや URL 入力で受け取ったデータを `GeoDataEntry` に正規化し、`Map.svelte` がその内容から MapLibre の `sources` と `layers` を再生成して描画する。  
この文書は、現行実装の入力判定、パーサー、座標変換、protocol、worker の流れをまとめたもの。

## 全体フロー

```mermaid
graph LR
    A[ファイル / URL入力] --> B[UploadPane]
    B --> C[FileManager]
    C --> D[各 Form]
    D --> E[パーサー / メタデータ解析]
    E --> F{座標系が確定しているか}
    F -- yes --> G[Entry作成]
    F -- no --> H[ZoneForm / GeoRefForm]
    H --> G
    G --> I[layerEntries]
    I --> J[Map.svelte createMapStyle]
    J --> K[createSourcesItems / createLayersItems]
    K --> L[mapStore.setStyle]
    L --> M[MapLibre GL JS]
    I --> N[deck.gl / three.js]
```

## 入力判定

`frontend/src/routes/map/components/upload/FileManager.svelte` がファイル種別を振り分ける。単純な拡張子判定だけでなく、いくつかの形式は中身も見ている。

### 単一ファイル

| 判定 | 遷移先 |
|---|---|
| `.geojson` `.json` `.fgb` | `GeoJsonForm` |
| `.topojson` | `TopoJsonForm` |
| `.gpx` | `GpxForm` |
| `.osm` | `OsmForm` |
| `.gml` | `GmlForm` |
| `.kml` `.kmz` | `KmlForm` |
| `.csv` | `CsvForm` |
| `.gpkg` | `GpkgForm` |
| `.pmtiles` | `PmtilesForm` |
| `.mbtiles` | `MBTilesForm` |
| `.las` `.laz` `.ply` `.pcd` `.xyz` | `PointCloudForm` |
| `.txt` | 先頭行を見て点群テキストなら `PointCloudForm` |
| `.glb` | `MeshModelForm` |
| `.obj` | 面要素があれば `MeshModelForm`、頂点のみなら `PointCloudForm` |
| `.nc` `.nc4` | `NetCDFForm` |
| `.grib2` `.grb2` `.grb` `.bin` | `Grib2Form` |
| `.landxml` | `LandXmlForm` |
| `.dm` `.dxf` `.sim` | 専用 Form |
| `.pdf` | `GeoPdfForm` |
| `.tif` `.tiff` `.png` `.webp` | `GeoTiffForm` |
| `.jpg` `.jpeg` `.heic` `.heif` | EXIF GPS があれば `GeoPhotoForm`、なければ `GeoPdfForm` |

### 特殊判定

| 判定 | 内容 |
|---|---|
| `.zip` | 先に GTFS ZIP を判定し、該当すれば `GtfsForm`。違う場合は展開して中のファイルを再判定する |
| `.xml` | 先頭を読んで `DEM XML` → `GML` → `LandXML` → `法務局地図XML` の順で判定する |
| 複数ファイル | Shapefile 一式、GeoTIFF + ワールドファイル / `.aux.xml`、OBJ + MTL + テクスチャのまとまりとして扱う |

## 形式別パイプライン

### ベクター系ファイル

| 入力 | Form | 主な処理 | 結果 |
|---|---|---|---|
| GeoJSON / JSON | `GeoJsonForm` | JSON 解析 | `VectorEntry` `format.type: 'geojson'` |
| FlatGeobuf | `GeoJsonForm` | FlatGeobuf 読み込み | `VectorEntry` `format.type: 'fgb'` |
| TopoJSON | `TopoJsonForm` | TopoJSON を GeoJSON に変換 | `VectorEntry` `format.type: 'geojson'` |
| Shapefile | `ShapeFileForm` | `.shp` `.dbf` `.shx` を結合して GeoJSON 化 | `VectorEntry` `format.type: 'geojson'` |
| GeoPackage | `GpkgForm` | SQLite を worker で解析 | `VectorEntry` `format.type: 'geojson'` |
| GPX | `GpxForm` | track / route / waypoint を GeoJSON 化 | `VectorEntry` `format.type: 'geojson'` |
| GML | `GmlForm` | 基盤地図情報系は自前処理、汎用 GML は OpenLayers ベースで変換 | `VectorEntry` `format.type: 'geojson'` |
| KML / KMZ | `KmlForm` | KML 解析、KMZ は展開後に処理 | `VectorEntry` `format.type: 'geojson'` |
| OSM XML | `OsmForm` | `osmtogeojson` で GeoJSON 化し、ジオメトリ種別ごとに登録 | `VectorEntry` `format.type: 'geojson'` |
| CSV | `CsvForm` | 指定列から座標を作って Point 化 | `VectorEntry` `format.type: 'geojson'` |
| DXF | `DxfForm` | CAD 図面を GeoJSON 化 | `VectorEntry` `format.type: 'geojson'` |
| DM | `DmForm` | 数値地形図データ（DM）を GeoJSON 化 | `VectorEntry` `format.type: 'geojson'` |
| SIMA | `SimaForm` | SIMA を GeoJSON 化 | `VectorEntry` `format.type: 'geojson'` |
| 法務局地図 XML | `MojXmlForm` | XML と内蔵座標系定義から GeoJSON 化 | `VectorEntry` `format.type: 'geojson'` |
| GeoPhoto | `GeoPhotoForm` | EXIF GPS を Point に変換 | `VectorEntry` `format.type: 'geojson'` |
| GTFS ZIP | `GtfsForm` | ZIP を解析し、停留所または路線を GeoJSON 化 | `VectorEntry` `format.type: 'geojson'` |
| GeoPDF 内蔵ベクター | `GeoPdfForm` | worker でベクター抽出 | `VectorEntry` `format.type: 'geojson'` |

### ラスター系ファイル

| 入力 | Form | 主な処理 | 結果 |
|---|---|---|---|
| GeoTIFF | `GeoTiffForm` | geotiff.js で読み、Terrarium 化する。1バンド時は `ラスター / 3Dメッシュ` を選べる | `RasterEntry` `format.type: 'image'` + `style.type: 'tiff'` または `ModelEntry` |
| PNG / JPEG / WebP + ワールドファイル | `GeoTiffForm` | ワールドファイルや `aux.xml` を使ってジオリファレンスする。必要なら `GeoRefForm` に進む | `RasterEntry` `format.type: 'image'` |
| GeoPDF 画像 | `GeoPdfForm` | 画像化し、必要なら手動ジオリファレンスする | `RasterEntry` `format.type: 'image'` |
| NetCDF | `NetCDFForm` | 指定変数を Terrarium 化する。`ラスター / 3Dメッシュ` を選べる。時間次元があれば保持する | `RasterEntry` `format.type: 'image'` + `style.type: 'tiff'` または `ModelEntry` |
| DEM XML | `DemXmlForm` | XML を worker 並列解析して標高配列を作る。`ラスター / 3Dメッシュ` を選べる | `RasterEntry` `format.type: 'image'` + `style.type: 'tiff'` または `ModelEntry` |
| GRIB2 / GPV | `Grib2Form` | 気象格子を読み、Terrarium 化する。同一格子・同一要素・同一レベルで時刻だけ違うときは時間軸付きにまとめる | `RasterEntry` `format.type: 'image'` + `style.type: 'tiff'` |
| HDF5 | `Hdf5Form` | 汎用ラスターは Terrarium 化する。EarthCARE 系の専用プロダクトはベクター化する | `RasterEntry` `format.type: 'image'` + `style.type: 'tiff'` または `VectorEntry` |
| LandXML | `LandXmlForm` | TIN を worker でラスタライズして DEM にするか、三角メッシュ GLB をそのまま使うかを選べる | `RasterEntry` `format.type: 'image'` + `style.type: 'tiff'` または `ModelEntry` |

### タイル・リモート配信

| 入力 | Form | 主な処理 | 結果 |
|---|---|---|---|
| XYZ ラスター URL | `RasterForm` | URL と tileSize を設定 | `RasterEntry` `format.type: 'image'` |
| XYZ DEM URL | `RasterForm` | `createDemRasterEntry` で登録 | `RasterEntry` `format.type: 'image'` + `style.type: 'dem'` |
| WMTS / WMS URL | `WmtsForm` | capabilities を読んでタイル URL を組み立てる | `RasterEntry` `format.type: 'image'` |
| PMTiles | `PmtilesForm` | メタデータを読んで vector / raster を判定 | `VectorEntry` or `RasterEntry` `format.type: 'pmtiles'` |
| MBTiles | `MBTilesForm` | ファイル解析後、vector / raster を判定 | `VectorEntry` or `RasterEntry` `format.type: 'mbtiles'` |
| ベクタータイル URL | `VectorForm` | MVT か GeoJSON Tile かを選んで登録 | `VectorEntry` `format.type: 'mvt'` or `geojsontile` |
| ArcGIS FeatureServer | `ArcGisForm` | レイヤー情報を取得し、bbox クエリ用 entry を作る | `VectorEntry` `format.type: 'esri-feature'` |
| ArcGIS MapServer | `ArcGisForm` | タイル URL を組み立てる | `RasterEntry` `format.type: 'image'` |
| STAC / COG URL | `StacForm` | 小さい画像は全体読込、大きい画像は COG タイル配信 | `RasterEntry` `format.type: 'image'` or `'cog'` |

### 3D・点群

| 入力 | Form | 主な処理 | 結果 |
|---|---|---|---|
| GLB / OBJ(面あり) | `MeshModelForm` | メッシュとして登録する。ローカルファイル時は bbox を計算し、小さいモデルは読み込み基準で拡大する。SkinnedMesh と animation clip も検出する | `ModelEntry` |
| 3D Tiles URL | `Tiles3DForm` | `tileset.json` を登録 | `ModelEntry` |
| LAS / LAZ / PLY / PCD / XYZ / TXT / OBJ(頂点のみ) | `PointCloudForm` | 点群を読み、必要なら座標変換 | `ModelEntry` |

## 座標変換と補助フォーム

### ZoneForm

ベクターや点群でバウンディングボックスが不正な場合は、自動登録せず `ZoneForm` に遷移する。  
確定後は `transformGeoJSONParallel()` または点群用 transformer worker で WGS84 に変換してから entry を作る。

ラスター系でも、座標範囲は読めるが座標系が確定しない場合は `ZoneForm` に進む。  
代表例は次のとおり。

- GeoTIFF で `rawBbox` は取れるが EPSG が不明
- LandXML で TIN の範囲はあるが投影法が取れない
- DEM XML / NetCDF で bbox があるが、追加の座標系確定が必要なケース

### GeoRefForm

GeoPDF や画像系で空間参照が足りない場合は `GeoRefForm` を使う。  
ここで確定したコーナー座標や bbox が `metaData.imageCorners` や bounds に入る。

`GeoRefForm` は単純な画像登録だけでなく、1バンド画像なら `ラスター / 3Dメッシュ` の分岐も持つ。  
GeoTIFF 系で bbox 自体が取れなかった場合は、ここで 4 コーナーを決めてから Terrarium ラスターまたは GLB メッシュを作る。

## ラスターから 3D メッシュへの分岐

`frontend/src/routes/map/utils/formats/geotiff/mesh.ts` の `createRasterMeshEntry()` が、GeoTIFF 系の 2 次元数値配列を GLB に変換する共通入口になっている。

対象は次のとおり。

- GeoTIFF 1バンド
- GeoRefForm 経由の 1バンド画像
- NetCDF の選択変数
- DEM XML

流れは次のとおり。

1. 入力バンドを間引き付き格子へサンプリングする
2. bbox または 4 corners から各頂点の地理位置を求める
3. `MercatorCoordinate.fromLngLat()` でローカル座標に置く
4. 値を高さにして `THREE.BufferGeometry` を組み立てる
5. 2三角形ずつ index を張って格子を三角メッシュ化する
6. 法線計算後に `GLTFExporter` で GLB を作る
7. `ModelEntry` として three.js カスタムレイヤーへ渡す

この経路で作るメッシュは、初期 style に次の特徴を持つ。

- 回転と平面スケールは UI から触れない
- 高さ倍率と高さオフセットは保持する
- 高さカラーランプを持てる
- NetCDF の 3D メッシュは初期状態で `陰影オフ / カラーランプオン`

## 時間軸の扱い

時間軸は `properties.temporal.dimension` と `state.dimension.currentIndex` に正規化する。  
vector 側の `properties.temporal.items` と違い、raster / model の時間軸は discrete dimension として扱う。

### 時間軸付きになる主な入力

| 入力 | 条件 | 形式 |
|---|---|---|
| WMS / WMTS | capabilities に time dimension がある | `RasterEntry` |
| Himawari / Nowcast 内蔵エントリ | fallback の timeDimension を持つ | `RasterEntry` |
| NetCDF | time 次元を検出した場合 | `RasterEntry` または `ModelEntry` |
| GRIB2 / GPV | 同一格子・同一要素・同一レベルで時刻だけ違う場合 | `RasterEntry` |
| GTFS / GPX / KML / TCX / HDF5 EarthCARE など一部ベクター | 時刻属性を抽出できる場合 | `VectorEntry` |

### ラスター時間軸の更新経路

- URL タイル系で `{morivis:dimension}` を含むものは、`dimension-runtime.ts` が runtime で source の tiles や auxiliary source を差し替える
- TIFF / DEM / COG 系は source の差し替えではなく、style 再生成やキャッシュ済みデータの切り替えで追従する
- `DimensionSelector.svelte` が Embla ベースのカルーセル UI を持ち、再生・停止・再生速度の制御もここで行う

### NetCDF 3D メッシュの時間更新

NetCDF を 3D メッシュで登録し、時間次元を持つ場合は `NetCDFDataCache` に元データと固定 slice 条件を保持する。  
時刻変更時は GLB を作り直さず、既存 `BufferGeometry` の `position.y` と `uv.y` を更新して高さとカラーランプを差し替える。

## Entry とソース生成

`Map.svelte` は `layerEntries` と preview 対象から `createMapStyle()` を実行し、`createSourcesItems()` と `createLayersItems()` に委譲する。

### VectorEntry

| format.type | MapLibre source |
|---|---|
| `geojson` `fgb` | `GeoJSONSource` |
| `mvt` | `VectorSource` |
| `pmtiles` | `VectorSource` |
| `mbtiles` | `VectorSource` |
| `geojsontile` | `VectorSource` |
| `esri-feature` | `VectorSource` |

### RasterEntry

| format.type | style.type | MapLibre source |
|---|---|---|
| `image` | `tiff` | `ImageSource` |
| `image` | `dem` | `RasterSource` |
| `image` | その他 | `RasterSource` |
| `pmtiles` | `dem` 以外 | `RasterSource` |
| `pmtiles` | `dem` | `RasterSource` |
| `mbtiles` | raster | `RasterSource` |
| `cog` | `tiff` | `RasterSource` |

### ModelEntry

- 3D Tiles と点群は deck.gl overlay で描画する
- GLB / OBJ と GeoTIFF 系メッシュは three.js のカスタムレイヤーで描画する
- animation clip を持つ GLB は `state.animation` で再生状態を持てる
- SkinnedMesh は custom shader に差し替えず、元材質ベースで描画する
- アップロード時に bbox と `xyzImageTile` を計算して preview / focus に使う

## カスタム protocol

`frontend/src/routes/stores/map.ts` で `MapLibre.addProtocol()` を管理している。

| protocol | 用途 | 実装 | 登録タイミング |
|---|---|---|---|
| `pmtiles://` | PMTiles の読み出し | `pmtiles` ライブラリ | 起動時に常時登録 |
| `webgl://` | DEM タイルの陰影・傾斜・方位・曲率レンダリング | `protocol/raster` | DEM 利用時に登録 |
| `cog://` | COG のタイルレンダリング | `protocol/cog` | COG 利用時に登録 |
| `mbtiles://` | MBTiles ファイルのタイル配信 | `protocol/mbtiles` | MBTiles 利用時に登録 |
| `geojson://` | GeoJSON タイル化 | `protocol/vector/geojson` | GeoJSON タイル利用時に登録 |
| `esri-feature://` | ArcGIS FeatureServer を bbox 単位でタイル化 | `protocol/vector/esri-feature` | ArcGIS vector 利用時に登録 |
| `tile_index://` | XYZ タイル境界の可視化 | `protocol/vector/tileindex` | タイル索引表示時に登録 |

`terrain` protocol はソースコードに残っているが、現在は停止している。

## Worker 一覧

| Worker | パス | 用途 |
|---|---|---|
| `transformer` | `frontend/src/routes/map/utils/proj/transformer.worker.ts` | GeoJSON 座標変換 |
| `pointcloud_transformer` | `frontend/src/routes/map/utils/proj/pointcloud_transformer.worker.ts` | 点群座標変換 |
| `gpkg` | `frontend/src/routes/map/utils/formats/gpkg/gpkg.worker.ts` | GeoPackage 解析 |
| `xml-parser` | `frontend/src/routes/map/utils/formats/dem-xml/xml-parser.worker.ts` | DEM XML 解析 |
| `terrarium_encode` | `frontend/src/routes/map/utils/formats/geotiff/terrarium_encode.worker.ts` | バンド値から Terrarium PNG を生成 |
| `terrarium_render` | `frontend/src/routes/map/utils/formats/geotiff/terrarium_render.worker.ts` | Terrarium PNG の描画と再投影 |
| `landxml rasterize` | `frontend/src/routes/map/utils/formats/landxml/rasterize.worker.ts` | TIN のラスタライズ |
| `geopdf vector-parse` | `frontend/src/routes/map/utils/formats/geopdf/vector-parse.worker.ts` | GeoPDF 内蔵ベクター抽出 |
| `protocol_geojson` | `frontend/src/routes/map/protocol/vector/geojson/protocol_geojson.worker.ts` | GeoJSON のベクタータイル化 |
| `protocol_esri_feature` | `frontend/src/routes/map/protocol/vector/esri-feature/protocol_esri_feature.worker.ts` | ArcGIS PBF のデコードとタイル化 |
| `tile_index` | `frontend/src/routes/map/protocol/vector/tileindex/tile_index.worker.ts` | タイル index 表示用 GeoJSON 生成 |
| `protocol_dem` | `frontend/src/routes/map/protocol/raster/protocol_dem.worker.ts` | DEM タイルの WebGL レンダリング |
| `protocol_cog` | `frontend/src/routes/map/protocol/cog/protocol_cog.worker.ts` | COG タイルの描画 |
| `generation_icon` | `frontend/src/routes/map/utils/icon/generation_icon.worker.ts` | POI アイコン生成 |

## モデルアップロード時の補助処理

`MeshModelForm.svelte` からローカルの GLB / OBJ を登録するときは、表示用 entry を作る前後で次の前処理を行う。

- `computeUploadedModelMeta()` でローカル `Box3` を計算する
- three カスタムレイヤーと同じ transform 式で bbox と `xyzImageTile` を出す
- 明らかに小さいモデルは `baseScale` を入れて読み込み基準で拡大する
- SkinnedMesh を含む場合は陰影 UI を無効化する
- animation clip がある場合は `properties.animation.clips` と `state.animation` を初期化する

この結果、ローカル読み込みモデルは URL 登録モデルより多くのメタデータを持つ。

## スタイル更新フロー

このプロジェクトでは、MapLibre のレイヤーを直接つまむより `mapStore.setStyle()` でスタイルを作り直す流れを基本にしている。

```text
入力データや表示設定の変更
  ↓
Map.svelte のリアクティブ処理
  ↓
createMapStyle()
  ↓
createSourcesItems() / createLayersItems()
  ↓
setStyleDebounce()
  ↓
mapStore.setStyle()
  ↓
MapLibre が差分適用
```

補足:

- preview 中は `showDataEntry` 用の source/layer だけを別系統で生成する
- deck.gl overlay と three.js レイヤーは MapLibre の style とは別に管理する
- `showXYZTileLayer` が有効なときだけ `tile_index://` source を追加する
