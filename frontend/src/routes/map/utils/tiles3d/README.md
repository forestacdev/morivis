# 3D Tiles の描画

`Map.svelte` → `mapStore.setTiles3DStyleEntries` → `Tiles3DLayerManager` → MapLibre の custom layer。
`3d-tiles-renderer/three` の `TilesRenderer` が、メッシュと点群のタイル取得・LOD・キャッシュを管理する。
通常の点群とベクターは引き続き deck.gl で描画する。

- entry に描画実体やキャッシュを持たせない。表示・色・透過度・照明・高さ・点サイズを runtime に同期する。
- ECEF をタイルセット中心の ENU に変換し、MapLibre とカメラ行列を同期する。高さ補正は元の座標に加算し、再設定で累積しない。
- スタイルだけの変更では TilesRenderer を再生成しない。URL変更・削除では通信を中止し、マテリアルやGPUリソースを解放する。
- MapLibre の差分スタイル更新では custom layer を維持する。スタイルを完全に読み直した場合は `style.load` で再接続する。
- タイル、glTFの外部buffer・画像・schemaを、既存のローカルファイル解決・dev proxy・gzip補正に通す。glTFの一時Blob URLは成功・失敗時に解放する。
- `.i3dm` と `.cmpt` の外部glTF参照は同じ取得経路で埋め込み、上流ローダーによる直接fetchを避ける。
- Draco、KTX2、Meshopt、暗黙タイルに対応するローダーを登録する。
- Dracoは`static/draco/`直下の通常版を使う。`gltf/`の専用版はPNTSの圧縮点群を復号できない。

## クリック属性

`MouseManager` → `mapStore.pickTiles3D` → Three.js Raycaster → `three-picking.ts` → 既存の属性パネル。

可視・クリック可能なメッシュから最も手前の面を選び、その地物IDに対応する属性行だけを取り出す。

- b3dm の Batch Table
- GLB の `EXT_mesh_features`: 頂点属性ID、暗黙の頂点ID、nullFeatureId
- `EXT_structural_metadata` の Property Table（文字列配列を含む）
- glTF の親子ノード変換、高さ補正

点群、i3dmのインスタンス属性、テクスチャ地物ID、Property Attributes/Textures のクリック取得は対象外。
IDや属性が読み取れない場合は、その状態を属性パネルに表示する。

## 検証

`__fixtures__/tiles.ts` の架空GLB・b3dmを実際のローダーに通し、面の交差判定と属性取得まで検証する。
座標変換、カメラ同期、マテリアル更新、外部glTF参照、ローカル解決、通信中止も関連specで確認する。
`draco-loader.spec.ts`は、同梱するWASM版・JS版デコーダーで架空の点群とメッシュを復号する。
地形との重なりや配信データ固有の拡張は、実画面で確認する。
