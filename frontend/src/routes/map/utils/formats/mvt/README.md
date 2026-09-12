# ローカルMVT

`tilejson.json` と `{z}/{x}/{y}.mvt` / `.pbf` のフォルダを受け取る。
TileJSONなしでもタイルの階層から範囲を取得できる。単体ファイルで階層が失われた場合は位置を推測しない。

- フォルダ内のFileを保持し、低ズームの最大8タイルでレイヤー・形状・属性を確認する。
- `MorivisVectorEntry`（format: `mvt`）に正規化し、通常のMapLibre source/layer生成を使う。
- `local-mvt://`プロトコルが表示要求ごとにFileを読む。gzipはタイル単位で展開する。
- `scheme: tms`は登録時にXYZへ変換する。TileJSON内の外部URLには通信しない。
- 欠けている座標は空タイルを返す。レイヤーの最後の所有者が削除されたらFileへの参照を解放する。
- ZIPは既存のZIP展開を経由するため、最初に全体を展開する。大容量ではフォルダを直接ドロップする。
- ページ再読み込み後のFile参照は復元しない。

仕様: [TileJSON 3.0.0](https://github.com/mapbox/tilejson-spec/tree/master/3.0.0)、[MapLibre addProtocol](https://maplibre.org/maplibre-gl-js/docs/API/functions/addProtocol/)
