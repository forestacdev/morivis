# SPZ

`.spz` を `GaussianSplatEntry` (`format.encoding: 'spz'`) として読み込み、既存の位置合わせ・Three.js描画へ渡す。

- v1〜3: gzip、v4: 属性ごとのZstandard圧縮に対応。
- ドロップ後はファイル名をデータ名にし、自動で位置合わせへ進む。先にヘッダーを確認し、本体はWorkerで展開して描画用配列をtransferする。
- キャンセル時はWorkerを終了する。初回の解析結果は既存キャッシュから描画へ渡し、再取得時もencodingに応じてデコードする。
- 座標はSPZ既定のRUB (X右 / Y上 / Z手前)。座標系拡張がある場合もRUBへ正規化する。
- v4のZstandardデコードには既存依存の `zstd-codec` を使い、必要なときだけ読み込む。

現在の共通Gaussian Splat描画は、基本色・透明度・最大軸半径から円形の点を描く簡易方式。回転による楕円形状、SH高次成分の視点依存色、深度ソート、学習時のアンチエイリアス補正は再現しない。SH次数はファイルの情報として表示する。

形式の参照: [Niantic SPZ](https://github.com/nianticlabs/spz)、[公式デコーダー](https://github.com/nianticlabs/spz/blob/main/src/cc/load-spz.cc)。指定デモは [Three.js WebGPU版のSPZLoader / GaussianSplat](https://github.com/ics-creative/260917_threejs_gaussian_splatting/blob/main/src/basic.ts) を使用するが、本実装は地図と共有する既存WebGLランタイムに接続する。
