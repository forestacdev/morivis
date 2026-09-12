# ローカル3D Tiles

`tileset.json`（`tiles.json`など別名も可）と参照ファイルを含むフォルダを地図へドロップする。
専用フォームで名前とタイルセットを選び、既存の `createTiles3DEntry()` へ登録する。
ZIPは展開時に相対パスを保持して同じ入口へ渡す。

- 判定はJSONの `asset.version` と `root` を使い、GeoJSONや単独GLBより優先する。
- 登録時に索引と子タイルセットの参照先を確認する。タイル本体の一括読み込みは行わない。
- `local-files.ts` が相対パスとFileの対応を保持し、deck.glの `loadOptions.fetch` から必要なファイルだけ返す。
- 仮想URLはアプリ内部の識別用で、ローカル参照をネットワークへ送らない。元データに明示された外部URLは通常のfetchで取得する。
- 同名ファイルは相対パスで区別する。子タイルセットやglTFの外部リソースも同じ基準で解決する。
- レイヤー削除・リセット・差し替えでファイル参照を解放する。同じURLを使うレイヤーが残る間は保持する。
- ファイル参照はページ内だけで有効。ページ再読み込み後は再ドロップが必要。

入力からの流れは `File[] → LocalTiles3DForm → Tiles3DEntry → Tile3DLayer`。
Fileやfetch関数はentryに入れず、runtime側で管理する。
取得関数はloaders.glの [LoaderOptions.fetch](https://loaders.gl/docs/modules/core/api-reference/loader-options) で子ローダーへ渡す。
