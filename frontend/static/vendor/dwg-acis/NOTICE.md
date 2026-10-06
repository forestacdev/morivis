# DWG ACIS runtime

`dwg_acis.js` / `dwg_acis_bg.wasm` は `tools/dwg-acis/` のRustブリッジから生成したものです。
再生成手順とブリッジのソースはリポジトリ内の `tools/dwg-acis/README.md`、依存バージョンは `Cargo.lock` を参照してください。

以下の既存ライブラリを組み込んでいます。MPL-2.0の全文は隣接する `LICENSE-MPL-2.0` に同梱しています。

- opencadcodec — Copyright Hakan AK、MPL-2.0
  - [配布物に対応するソース](https://github.com/HakanSeven12/opencadcodec/tree/fe69506cb99dea6f4c4a73b690a27fdf04403ea0)
- opencadkernel — MPL-2.0
  - [修正前のソース](https://github.com/HakanSeven12/opencadkernel/tree/ae28f669f8a5673585c2c5c5b3617876c8b7bf98)
  - 配布物に対応する修正済みソース: [tools/dwg-acis/vendor/opencadkernel](../../../../tools/dwg-acis/vendor/opencadkernel)。楕円断面・円筒の継ぎ目・トーラスの特異点・周期面の境界と曲面分割を補正しています。不要な曲面評価を省き、細分化で影響する三角形を局所的に再判定します。架空データの回帰テストと変更内容は同ディレクトリの `MORIVIS.md` を参照してください。

生成ツール: wasm-bindgen-cli 0.2.105。releaseは実行速度を優先する `opt-level = 3`・LTOでビルドしています。依存全体はブリッジのCargo.lockに記録しています。
