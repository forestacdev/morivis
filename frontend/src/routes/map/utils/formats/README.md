# formats

`utils/formats` は、入力形式ごとの正規化層です。

- 形式ごとに `frontend/src/routes/map/utils/formats/{format}/` を切る
- 入口は `index.ts`
- テストは `index.spec.ts`
- サンプル入力は `__fixtures__/`
- ブラウザ依存は入口か補助層に閉じ込める

いまの整理軸は次の4つです。

- 単一形式のパーサー
  `csv/`, `geojson/`, `gml/`, `gpx/`, `kml/`, `osm/`, `topojson/`, `wkt/`
- 複数ファイルや worker を持つ形式
  `dem-xml/`, `dm/`, `geopdf/`, `geotiff/`, `gpkg/`, `gtfs/`, `landxml/`, `netcdf/`
- 補助形式
  `arcgis/`, `export/`, `raster/`, `transformers/`, `wcs/`
- まだ単独ファイルのまま残っている形式
  テスト追加や責務分割のタイミングで順次ディレクトリ化する

単独ファイルを新規追加しない。
