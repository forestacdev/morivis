# ASCII Grid

Esri ASCII Raster / GDAL AAIGridの`.asc`をブラウザ内で読み込み、1バンドの`RasterImageEntry<RasterTiffStyle>`または既存の3Dメッシュentryへ正規化する。
追加の依存パッケージは使わない。

## 対応する入力

- `NCOLS`・`NROWS`、`XLLCORNER/YLLCORNER`または`XLLCENTER/YLLCENTER`
- `CELLSIZE`、GDALの長方形セル拡張`DX/DY`
- `NODATA_VALUE`（省略時は-9999、明示的なNaNも可）
- 整数・小数・負数・指数表記、大小文字・空白・改行の違い
- 同じディレクトリ・同じベース名の`.prj`（Proj4が解釈できるWKTなど）

セルは北→南、西→東の順に保持する。CENTER指定は半セル補正して外縁のbboxに直す。
欠損値はNaNへ正規化し、値の範囲から除く。ヘッダーの重複・矛盾、セル数の過不足、全セル欠損はエラーにする。
複数ASCを選択した場合だけ、フォームで対象を1つ選択してから処理する。

## 座標系と登録

`.asc`の座標値だけからWGS84と推定しない。PRJがあればその座標系でラスターを作り、そのままエントリー登録へ進む。PRJがない・空・座標変換できない場合はZoneを自動で開き、EPSGの確定後に登録へ進む。
古いArc/Infoのキーワード型PRJなど、解釈できない定義も座標系の手動選択へ回す。座標系フォームから戻った場合は、位置合わせや3Dメッシュも選べる。

解析と再投影はWorkerで実行する。投影された外枠だけを引き伸ばすのではなく、WGS84の等間隔格子のセル中心を元の座標系へ逆投影し、最近傍のセル値を採用する。
出力の行列数は元と同じ。Web Mercatorで表示できる緯度範囲へクリップし、日付変更線をまたぐデータは分割を案内する。

ラスターは既存のTerrariumエンコード・GeoTiffCache・tiffスタイルを使う。欠損セルは透明となる。
3Dメッシュは既存のメッシュ生成を使い、セル値をメートル単位の高さとして扱う。標高以外の値ではラスターを選ぶ。
解析・再投影Workerは入力切替やキャンセル時に停止し、古い結果を登録しない。

## 検証

`__fixtures__`の架空格子・投影定義を使い、ヘッダー、セル順、欠損値、PRJの対応付け、逆投影、入力の振り分けを検証する。
実在地点や個人環境のファイルをテストへ組み込まない。

参照: [Esri ASCII raster format](https://desktop.arcgis.com/en/arcmap/latest/manage-data/raster-and-images/esri-ascii-raster-format.htm)、[GDAL AAIGrid](https://gdal.org/en/stable/drivers/raster/aaigrid.html)。
