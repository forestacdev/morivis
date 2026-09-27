# Draco decoder

このディレクトリ直下のデコーダーは、Three.js 0.177.0 の
`examples/jsm/libs/draco/` から同梱した通常版です。
3D TilesのDraco圧縮点群（PNTS）とメッシュの両方に使います。
`gltf/` の専用ビルドでは点群を復号できません。

更新時は `draco_decoder.js`、`draco_decoder.wasm`、`draco_wasm_wrapper.js` を
同じバージョンからまとめてコピーし、点群とメッシュの復号テストを実行してください。

配布元: https://github.com/mrdoob/three.js/tree/r177/examples/jsm/libs/draco

ライセンス: Apache License 2.0（https://github.com/google/draco/blob/main/LICENSE）
