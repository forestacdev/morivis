# Excel の読み込み

セルの表は既存の `index.ts` で座標列から Point に変換する。
`drawings.ts` はブック → シート → DrawingML の関連ファイルをたどり、
図形、テーマ、埋め込み画像を読み込む。
図形または画像があるシートでは図面を初期選択し、セルの表にも切り替えられる。

## 図面の登録方法

- **図面画像**（初期選択）: `drawing-appearance.ts` が塗り・線色・文字・画像を重なり順に SVG 化し、`drawing-rasterize.ts` が透明 PNG に変換する。位置合わせ後は既存の `RasterImageEntry<RasterBaseMapStyle>` に URL と四隅を保存する。色の再正規化や黒色の透明化は行わない。
- **線**: `drawing-geometry.ts` が輪郭をローカル座標の LineString に変換する。位置合わせ後は GeoJSON ベクターレイヤーとして線幅 1px で登録し、図形名と図形内の文字を属性に保持する。塗り・線色・文字の描画・画像はこのモードには含めない。

図面画像は長辺最大 4096px、総画素数最大 800 万画素、元サイズの最大 2 倍で生成する。
文字と画像を含む図面は一枚の画像として拡大される。線幅を画面上の 1px に保ちたい場合は「線」を選ぶ。
ブックの ZIP と XML の解析結果はフォーム内だけに保持する。entry には PNG のデータ URL と宣言的な表示設定を保存し、描画ライブラリは直接操作しない。

レイヤーメニューのダウンロードボタンから、図面画像と位置情報（PNG・aux.xml）を ZIP で保存できる。
出力時は回転・四隅の変形を反映した北向きの EPSG:3857 画像に変換し、透明部分を保持する。

## 対応範囲

- 自由図形の数値座標による移動・直線・二次/三次ベジェ曲線・閉路
- 四角形、楕円、三角形、直角三角形、ひし形、直線、直線コネクタ
- グループの入れ子、子座標の拡大縮小、回転、水平/垂直反転
- 明示的な図形座標。座標が省略された場合はセルアンカーや絶対アンカーを利用
- 単色の塗りと線色、塗りなし・線なし、線幅、主な破線
- RGB・テーマ色・システム色の代替 RGB と主要なプリセット色。テーマの塗り・線の参照、透明度、tint/shade、明度・彩度の主な補正
- 図形内の文字、段落と改行、簡易折り返し、文字サイズ・色・太字・斜体・下線、左右中央揃え、上下中央配置、文字の回転
- PNG/JPEG/GIF/WebP の埋め込み画像。配置・重なり順・回転・反転・矩形の切り抜き・透明度
- 画像だけのシート

## 制限

Excel と同じ組版エンジンではないため、文字の折り返しや行間は近似になる。
フォントは端末にあるものを利用する。縦書きは横書きとして表示し、警告する。
図形の枠をはみ出す文字や文字効果、グラフ・SmartArt、セルの罫線・セル文字は再現しない。
グラデーション・模様・図形の画像塗り、矢印、影、画像効果、画像タイル配置は未対応。
座標の計算式、円弧命令、上記以外のプリセット図形も未対応。
未対応図形は輪郭と塗りを省略し、解釈できる文字は表示する。
未対応や欠落・外部参照の画像は除外数を表示する。EMF/WMF/SVG 画像は埋め込まない。
セルアンカーの列幅は既定フォント相当の幅で換算するため、明示的な図形座標がないブックではフォントによる位置の差が生じることがある。

XML 内の DTD を拒否し、外部参照は取得しない。
生成 SVG に入力 XML を直接挿入せず、数値・検証した色・エスケープした文字とフォント名だけを使用する。
画像は ZIP 内の関連ファイルから読み込み、バイナリのシグネチャで形式を限定する。

変換の参照: Microsoft の [グループ座標変換](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.transformgroup)、[セルアンカー](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.spreadsheet.twocellanchor)、[単色塗り](https://learn.microsoft.com/ja-jp/dotnet/api/documentformat.openxml.drawing.solidfill)、[画像の切り抜き](https://learn.microsoft.com/ja-jp/dotnet/api/documentformat.openxml.drawing.sourcerectangle)。

`drawings.spec.ts` と `drawing-appearance.spec.ts` は `__fixtures__/drawing-workbook.ts` で生成する架空のブックを使う。
