# CityGML

`CityGmlForm.svelte` からファイルを読み込み、WorkerでCityGMLを標高付きGeoJSONに変換する。
読み込み方式は3Dモデルまたは2Dを選べる。どちらも変換完了後にそのまま登録する。
3Dは `createCityGmlEntry()` → `GeoJson3DEntry` → 既存のdeck.gl `GeoJsonLayer` に渡す。
描画側は `extruded: false` / `_full3d: true` を使い、壁面や屋根の各頂点のZを保持する。

2Dは `createCityGml2DEntry()` で高さを除き、`createGeoJsonEntry()` に渡す。
平面に投影すると面積がなくなる壁面等は除外し、属性と有効な内周は保持する。
建物の面を投影する方式であり、重なる屋根・底面を統合したフットプリントは生成しない。

## 入力と変換

- `.gml` / `.xml` はCityGMLの名前空間を先頭64 KiBから判定する。`.citygml` は専用フォームへ渡す。
- CityGML 1.0 / 2.0の `Building` / `BuildingPart` が対象。
- LOD0〜4から指定、または各建物の最高LODを選択する。指定LODがない建物は件数を報告する。
- Solidを優先し、同じ面をSolidと境界面から二重に取り込まない。Solidがない場合はMultiSurfaceなどの面を読む。
- Polygon / Triangleの外周・内周を保持し、建物単位のMultiPolygonを作る。LinearRingのposList / posに対応。
- 同一ファイル内の `xlink:href="#id"` を解決する。参照切れ、循環、不正な座標はエラーにする。
- IDと名称、建物属性を保持する。入れ子の属性はドット区切りにし、複数値はカンマ区切りにする。
- 複数ファイルはWorker内で順番に処理する。元IDは `properties.gml_id`、ファイル名は `properties.sourceFile` に残す。
- フォームの「読み込む」で変換を開始し、完了後はそのままレイヤー登録へ進む。対象外の建物数は通知に表示する。
- キャンセル時はWorkerを終了する。処理中にファイルが変わった場合は古い結果を登録せず、再読み込みを促す。

## 座標と制限

EPSG:6697 / 6668 / 4326 / 4979 / 4612の緯度・経度順を、経度・緯度順に並べ替える。
CRS84 / CRS84hでは経度・緯度順を維持する。高さはメートル単位の入力値をそのまま保持する。
PLATEAU GIS ConverterのWGS84出力で行うジオイド補正（標高→楕円体高）は行わない。
投影座標、座標系不明、2次元の点列はエラーにする。

CityGML 3.0、建物以外の都市オブジェクト、テクスチャ、外部ファイル参照、ImplicitGeometry、曲面は対象外。
親建物に選択LODのSolidがある場合は構成部品を重ねない。
XMLはファイル単位でDOMへ展開するため、巨大な単一ファイルにはメモリ制約がある。

## 参照

- [PLATEAU GIS Converter transformer](https://github.com/Project-PLATEAU/PLATEAU-GIS-Converter/tree/main/nusamai/src/transformer): 座標変換、LOD選択、属性整形の分離。
- [GeoJSON sink](https://github.com/Project-PLATEAU/PLATEAU-GIS-Converter/blob/main/nusamai/src/sink/geojson/mod.rs): Solid / SurfaceをMultiPolygonへ展開する構成。
- [PLATEAUの座標・高さ](https://www.mlit.go.jp/plateau/learning/tpc03-4/)
- [deck.glの3Dポリゴン](https://deck.gl/docs/api-reference/layers/solid-polygon-layer#_full3d-boolean-optional)

Rust実装の移植ではなく、上記の構成を参考にしたブラウザ用の変換処理。
