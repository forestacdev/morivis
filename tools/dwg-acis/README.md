# DWG ACIS bridge

DWGの読み取りにopencadcodec、ACIS形状の三角形分割にopencadkernelを使う。
依存はCargo.tomlとCargo.lockで固定し、独自のSAT/SABパーサーや曲面メッシャーは実装しない。

生成物は `frontend/static/vendor/dwg-acis/`。通常のfrontendの実行・テスト・ビルドにRustは不要。
再生成にはRustの `wasm32-unknown-unknown` targetと `wasm-bindgen-cli 0.2.105` が必要。
リポジトリのルートで以下を実行する。

```sh
RUSTFLAGS="--cfg getrandom_backend=\"wasm_js\" --remap-path-prefix=$PWD=." cargo build --locked --manifest-path tools/dwg-acis/Cargo.toml --target wasm32-unknown-unknown --release --lib
wasm-bindgen tools/dwg-acis/target/wasm32-unknown-unknown/release/morivis_dwg_acis.wasm --target web --out-dir frontend/static/vendor/dwg-acis --out-name dwg_acis
```

架空fixtureの生成:

```sh
cargo run --locked --manifest-path tools/dwg-acis/Cargo.toml --bin fixtures -- frontend/src/routes/map/utils/formats/dwg/__fixtures__
```

- 3DSOLID・BODY・REGIONのSAT/SABを読み取る。表示対象はモデル空間。
- ACIS bodyの変換行列はkernelが適用する。通常のINSERTは基点・倍率・回転・入れ子の配置を反映する。
- MINSERT内のACISは除外対象として報告する。循環参照・32段を超えるブロック参照は図面全体の読み込みを止める。
- 色はエンティティ色・ByLayer・ByBlockを解決する。面別の材質やテクスチャは再現しない。
- kernelの欠落情報・未描画面・非有限座標を検出した場合、そのソリッド全体を除外する。ハンドル・レイヤー・要素種別・ブロック名の経路・理由を返し、フォームに表示する。変換できたソリッドだけを返し、上限の使用量に加算する。
- 非周期NURBS面のトリム境界が不整合の場合は、元の3D辺を曲面へ再投影して再試行する。辺のサンプルと曲面の距離が線形許容差以内で、全ての面を変換できた場合だけ採用する。元の曲面・辺・入力トポロジーは変更しない。
- アプリはドロップ時に `inspect_dwg` で通常図形とソリッドのレイヤー・種類を取得する。この段階ではSAT/SABの解析や三角形化を行わない。決定後は `decode_dwg_layers` で選択したレイヤーだけを三角形化する。図面は各段階のWorkerで読み直し、単位変更だけなら再読み込みしない。
- バイナリAPIには三角形数の上限を設定しない。Workerの自動タイムアウトも設けず、キャンセル時にWorkerを終了する。
- `decode_dwg` のJSON出力と三角形数上限引数は、少量データの互換性・制限処理のテスト用に残す。大きな図面はバイナリ出力を使う。
- ブリッジへ小さい上限を指定した場合は、それを超える部品全体を除外して理由を返す。後続の部品が残りの上限に収まれば読み込む。
- DXFのACIS読み込みはこのブリッジの対象外。

upstream本体のソース変更はない。両依存のライセンスはMPL-2.0。配布WASMに対応する正確なソースとライセンスは生成物側のNOTICEを参照。

Rust側の回帰検証: `cargo test --locked --release --manifest-path tools/dwg-acis/Cargo.toml --lib`。架空の箱の体積・重心、入力の非破壊性、曲面から離れた辺を補正対象にしないこと、複数bodyを持つ部品を丸ごと除外した後も残りの上限を正しく扱うことを確認する。

## バイナリ中間データ

`MDW1` の4バイト識別子、JSONヘッダー長（u32 little-endian）、UTF-8ヘッダーを置き、8バイト境界へ揃える。
ヘッダーには通常図形のDXF・除外情報・各ソリッドのレイヤー、色、要素種別、頂点数、三角形数を格納する。
その後はソリッドごとに XYZ（f64 × 3）、三角形の頂点番号（u32 × 3）をlittle-endianで格納し、次のソリッドの前で8バイト境界へ揃える。
座標や頂点番号をJSONに展開しないため、単一のJSON文字列の巨大化と、その解析時の配列オブジェクト増加を避けられる。
フロントエンドは同じArrayBufferのTypedArrayビューとして読み取り、単位換算後にWorkerから所有権を転送する。
