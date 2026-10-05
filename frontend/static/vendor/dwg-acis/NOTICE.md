# DWG ACIS runtime

`dwg_acis.js` / `dwg_acis_bg.wasm` は `tools/dwg-acis/` のRustブリッジから生成したものです。
再生成手順とブリッジのソースはリポジトリ内の `tools/dwg-acis/README.md`、依存バージョンは `Cargo.lock` を参照してください。

以下の既存ライブラリを変更せず組み込んでいます。MPL-2.0の全文は隣接する `LICENSE-MPL-2.0` に同梱しています。

- opencadcodec — Copyright Hakan AK、MPL-2.0
  - [配布物に対応するソース](https://github.com/HakanSeven12/opencadcodec/tree/fe69506cb99dea6f4c4a73b690a27fdf04403ea0)
- opencadkernel — MPL-2.0
  - [配布物に対応するソース](https://github.com/HakanSeven12/opencadkernel/tree/ae28f669f8a5673585c2c5c5b3617876c8b7bf98)

生成ツール: wasm-bindgen-cli 0.2.105。依存全体はブリッジのCargo.lockに記録しています。
