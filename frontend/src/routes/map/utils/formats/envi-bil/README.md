# ENVI／ESRI BIL

HDRと画像本体を同時にドロップする。ZIP・フォルダ内でも同じフォルダ・名前で対応付ける。
`test.hdr` + `test.bil`、`test.bil.hdr` + `test.bil`、拡張子なしのENVI本体に対応。
本体の拡張子は `.bil` / `.bip` / `.bsq` / `.dat` / `.img` / `.raw` / `.bin`。
`.bin`単独は既存のGRIB2判定を維持するため、ENVIでは必ずHDRを一緒に選ぶ。

- 非圧縮のBIL・BIP・BSQ、両バイト順、ヘッダーオフセット、ESRIの行・バンド間余白。
- ENVI data type 1 / 2 / 3 / 4 / 5 / 12 / 13。ESRIは8・16・32bit整数、32・64bit浮動小数。
- 欠損値、NaN、Infinityを透明セルとして扱う。バンドごとの範囲を保持する。
- 単バンドはカラーマップと既存のDEM機能、多バンドはバンド選択・RGB表示へ接続する。
- ENVIのdefault bandsを自動登録時の初期表示に使う。手動位置合わせは既存の先頭バンド表示を使う。

## 配置

ENVI map info（回転を含む）またはESRI ULXMAP / ULYMAP / XDIM / YDIMから外縁を求める。
ENVIの参照画素は1始まりの外縁、ESRIのULXMAP / ULYMAPは画素中心として扱う。
HDRに位置情報がない場合は同名のBLW / BPW / BQW / WLD / BILWなどを読む。
位置がなければ地図上の位置合わせへ進む。

座標系は同名PRJを優先し、ENVI coordinate system stringのWKTも解釈する。
明記されたWGS84の緯度経度・UTMはmap infoから推定する。
その他のdatum・投影や解釈できないPRJは座標系フォームへ進む。
判明した座標系はWorkerでWGS84へ最近傍変換し、そのままエントリー登録へ進む。
解析・変換・登録中は共通スクリーンガードを表示する。

## 制限

- 本体512 MiB、HDR・PRJ・ワールドファイル各1 MiB、総サンプル数16,777,216、バンド数1,024まで。
- 圧縮、複素数、64bit整数、1・4bit packed値、ENVIスペクトルライブラリは未対応。
- 色テーブル・クラス名・波長情報・ESRI独自の旧形式PRJは解釈しない。Classificationは数値バンドとして読む。
- 再投影後の縦横セル数は元画像と同じ。回転・投影によって空白や再標本化が生じる。
- 日付変更線をまたぐ画像は分割が必要。極域はWeb Mercator表示範囲へ切り詰める。

## 参照

- [ENVI Header Files](https://www.nv5geospatialsoftware.com/docs/enviheaderfiles.html)
- [ArcGIS: BIL, BIP, and BSQ raster files](https://desktop.arcgis.com/en/arcmap/latest/manage-data/raster-and-images/bil-bip-and-bsq-raster-files.htm)
- [GDAL ENVI driver](https://gdal.org/en/stable/drivers/raster/envi.html)

`__fixtures__`は任意の値で作った3×2セルの架空画像。実データは使用していない。
