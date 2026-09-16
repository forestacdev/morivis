# 7z-wasm 1.2.0

RIK（Microsoft CAB / LZX）のブラウザ内展開に使用する。JSとWASMは未改変。
既存のvendor資産と同様、必要時にのみWorkerから読み込む。

- 配布元: https://registry.npmjs.org/7z-wasm/-/7z-wasm-1.2.0.tgz
- 配布アーカイブSHA-256: `add07182a789aec966837acb4d75bf97ca8d322f046016d4abc1f4153746e997`
- ソース・ビルド手順: https://github.com/use-strict/7z-wasm
- ライセンス: `License.txt`、`unRarLicense.txt`（LGPL 2.1以降 + unRAR restriction）

更新時は同じ配布アーカイブの `7zz.es6.js`、`7zz.wasm` とライセンスを一緒に置き換え、
バージョン・ハッシュを更新する。CABの無圧縮fixtureとLZXのサンプルを検証する。
