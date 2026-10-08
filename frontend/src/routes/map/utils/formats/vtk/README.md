# VTK（メッシュ・構造格子）

VTKのメッシュとスカラー値を読み込み、表面をGLBへ変換して既存のモデル配置画面へ渡す。
内部レイヤーは `MeshEntry`（`format.type: gltf`）を使う。VTKの配列やThree.js実体をentryに追加しない。

## 対応範囲

- Legacy `.vtk`: ASCIIとbig endian BINARY。`POLYDATA` / `UNSTRUCTURED_GRID` / `STRUCTURED_POINTS` / `RECTILINEAR_GRID` / `STRUCTURED_GRID`。
- Legacyの従来のセル配列と、`OFFSETS` / `CONNECTIVITY`によるセル配列。
- XML `.vtp` / `.vtu` / `.vti` / `.vtr` / `.vts`: `PolyData` / `UnstructuredGrid` / `ImageData` / `RectilinearGrid` / `StructuredGrid`。同一ファイル内の複数Pieceを結合する。
- 構造格子の2D面・3D外表面。ImageDataはExtent、Origin、Spacing、Directionを反映する。
- XMLのASCII、inline Base64、appended Base64 / raw。little / big endian、UInt32 / UInt64ヘッダー、非圧縮 / zlib。
- 三角形、多角形、四角形、pixel、triangle strip。
- 四面体、六面体、voxel、三角柱、四角錐の外表面。同じ頂点参照を持つ体積セル間の共有面を除外する。
- 2次三角形（6節点）、2次四角形（8 / 9節点）、2次四面体（10節点）、2次六面体（20 / 27節点）、2次三角柱（15節点）、2次四角錐（13節点）。VTKセル型22–29を対象とし、型21の2次線分は描画から除外する。
- 点・セルの1成分スカラー。Legacyの `SCALARS` と属性に関連付けられた `FIELD`、XMLの `DataArray`。
- ローカルファイル、複数ファイルからの選択、ZIP展開後の入力。

点・線セルは数を表示したうえで描画から除外する。面がない入力は拒否する。
上記以外の高次セル（Lagrange / Bézier・任意次数・混合次数など）、polyhedron、外部Pieceを参照する並列ファイル（`.pvtu` 等）、時系列コレクション、VTKHDF、非ゼロghost属性は対象外。
Legacyのプラットフォーム依存 `long` / `unsigned_long` / `bit`、文字列FIELD、METADATAも対象外。
XMLのLZ4 / LZMA圧縮には対応しない。未対応の構造や配列はエラーを表示し、部分的な形状を黙って登録しない。
ベクトル・テンソル・法線・テクスチャ座標・元のカラーテーブルは可視化に使わない。

複数Pieceでは点・セルのローカル番号を振り直す。体積セルの共有面は全節点の座標が厳密に一致する場合に除外し、点スカラーはPieceごとに保持する。同名・同じ関連先のスカラーを結合し、配列がないPieceはNaNで補う。点数の表示はPiece境界の重複点も含む。

## 色と位置

ファイルを選ぶと自動で解析を開始する。解析中は処理状況を表示し、キャンセル・ファイル切替で中断できる。
解析後にスカラー、上方向（Z / Y）、座標の単位（m / cm / mm）を選択する。
スカラーの有限値の全範囲を青→シアン→緑→黄→赤へ割り当てる。定数は中央色、欠損・非有限値は灰色。
2次曲面は各辺を4分割した三角形で近似する。生成した頂点の座標と点スカラーに同じ形状関数を使う。色の範囲は元の節点の有限値で決め、補間値が範囲外なら端の色へ丸める。
点属性は三角形の頂点色、セル属性は元セルの面全体の色としてGLBへ保存する。
選んだ名前・関連先・値域・単位・軸はGLBのextrasにも保存する。凡例は取り込み画面で表示する。
登録後に解析値を切り替える場合は元ファイルを再度読み込む。

単位換算とY-upへの変換を行い、元の原点をモデルの平行移動として保持する。
CRSを自動確定しない。GLBと共通の座標系選択・位置合わせ・配置フローを使う。
地理座標（経緯度）をそのままメートルとして扱わないよう、入力はローカル直交座標または投影座標を想定する。

## 制限・検証

容量・点数・セル数・描画頂点数・処理時間の上限は `definition.ts` を参照。
解析とGLB変換はWorkerで実行する。ファイル切替・キャンセル・画面破棄・時間切れでWorkerを終了する。
検証には `__fixtures__/` の架空の凹ポリゴン、接する四面体、構造格子、曲面2次セル、バイナリ生成コードを使う。
単体テストで配列の復号、共有面の除外、属性対応、GLBの色・軸・寸法、入力制限、Worker解放を確認する。

仕様参照: [Legacy](https://docs.vtk.org/en/latest/vtk_file_formats/vtk_legacy_file_format.html)、[XML](https://docs.vtk.org/en/latest/vtk_file_formats/vtkxml_file_format.html)。
