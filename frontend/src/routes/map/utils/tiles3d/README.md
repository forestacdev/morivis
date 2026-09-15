# 3D Tiles のクリック属性

`MouseManager` → `mapStore.pickTiles3D` → `picking.ts` → 既存の属性パネル。

- deck.gl の `pickObject` で可視・クリック可能なメッシュのタイルを特定する。
- サブレイヤーの `projectPosition` と viewport の逆投影で、頂点とクリックのレイを共通座標に揃える。ノード変換、タイルのモデル行列、原点と高さ補正を反映する。
- 交差する最も手前の面から地物IDを取得し、`feature-metadata.ts` でその行だけを読む。
- `_BATCHID` / `BATCHID` / `_FEATURE_ID_n` は描画用属性から除去する前に WeakMap に保持する。entry には描画実体やキャッシュを持たせない。
- ジオメトリの探索はクリック時のみ。対象タイルの頂点・面数に比例するため、大きな単一タイルではクリックに時間がかかる。追加の描画用 canvas は作らない。

## 対応

- b3dm の Batch Table: JSON 属性、バイナリの数値・ベクトル属性
- GLB の `EXT_mesh_features`: 頂点属性ID、暗黙の頂点ID、nullFeatureId
- `EXT_structural_metadata`: 埋め込み schema と Property Table。文字列、数値、真偽値、列挙、固定長・可変長配列、noData/default、normalized、scale/offset
- 三角形リスト・ストリップ・ファン、ネストした glTF ノード

新規アップロードのメッシュとカタログの3D都市モデルはクリックを有効にしている。以前に保存したクリック無効のレイヤーは、追加し直す必要がある。

## 現段階の制限

点群、i3dm のインスタンス、テクスチャの地物ID、外部 schema、Property Attributes/Textures、Batch Table Hierarchy は対象外。スキニングやアニメーションによる変形、アルファテクスチャの穴は交差判定に反映しない。地物単位のハイライトはまだ行わない。

IDや属性が読み取れない場合は、その状態を属性パネルに表示する。実画面での検証は別途必要。

検証は架空の GLB/b3dm を生成し、実ローダー → 描画前処理 → 面の選択 → 属性行の取得を通す。高さ補正を含む実際の deck.gl 投影も GPU を作らず検証する。
