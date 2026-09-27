# Excel の読み込み

セルの表は既存の `index.ts` で座標列から Point に変換する。
`drawings.ts` はブック → シート → DrawingML の関連ファイルをたどり、
`drawing-geometry.ts` でオートシェイプをローカル座標の LineString に変換する。
図形があるシートでは図面を初期選択し、セルの表にも切り替えられる。

図面の座標は地理座標ではないため、XlsxForm から既存のベクター GeoRef へ渡す。
位置合わせ後は通常の GeoJSON ベクターレイヤーとして登録する。
描画ライブラリの直接操作や専用の entry は追加しない。

## 対応範囲

- 自由図形の数値座標による移動・直線・二次/三次ベジェ曲線・閉路
- 四角形、楕円、三角形、直角三角形、ひし形、直線、直線コネクタ
- グループの入れ子、子座標の拡大縮小、回転、水平/垂直反転
- 明示的な図形座標。座標が省略された場合はセルアンカーや絶対アンカーを利用
- 図形名と図形内の文字を属性として保持

塗り、線色・線種、矢印、文字の描画、セルの罫線、埋め込み画像、グラフは再現しない。
座標の計算式、円弧命令、上記以外のプリセット図形は未対応。
未対応の図形は除外数を表示する。セルアンカーの列幅は既定フォント相当の幅で換算するため、
明示的な図形座標がないブックではフォントによる位置の差が生じることがある。

XML 内の外部参照を取得せず、生成 SVG には数値と内部 ID のみを入れる。
ブックの ZIP と解析結果はフォーム内に保持し、entry やグローバルキャッシュへ保存しない。

変換の参照: Microsoft の [グループ座標変換](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.transformgroup)
と [セルアンカー](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.spreadsheet.twocellanchor)。

`drawings.spec.ts` は `__fixtures__/drawing-workbook.ts` で生成する架空のブックを使う。
