# ローカルMLT

`{z}/{x}/{y}.mlt` / `.mlt.gz` のフォルダまたはZIPを読み込む。`tilejson.json` は省略できる。

- `@maplibre/mlt` で少数のタイルからソースレイヤー・形状・属性を取得する。
- `MorivisVectorEntry` の `format.type: 'mlt'` に正規化し、MapLibre sourceには `encoding: 'mlt'` を指定する。
- 登録フォーム、フォルダ検査、Fileの保持・解放はMVTと共通。`local-mvt://`は両形式のバイト配信に使う。
- MVTやGeoJSONに変換せず、描画要求のあるタイルだけ読み込む。gzipもタイル単位で展開する。
- 階層のない単体ファイルは位置を推測しない。再読み込み後はフォルダの再登録が必要。
- ZIPは展開時に全体を読み込むため、大容量データはフォルダを直接ドロップする。

仕様: [MapLibre Tile](https://maplibre.org/maplibre-tile-spec/)、[vector source encoding](https://maplibre.org/maplibre-style-spec/sources/#vector-encoding)
