# JPEG2000 / GeoJP2

`.jp2`を専用WorkerのOpenJPEGで復号し、既存の数値ラスターentryへ登録する。
gdal3.jsは使用しない。復号専用WASM（約254 KiB）はこの形式の読み込み時にだけ取得する。

## 対応

- JPEG2000 Part 1の1〜16bit整数画素。RGB・グレースケール（1バンドまたは3バンド、同じ精度と解像度）。
- GeoJP2 UUID内のGeoTIFFによるEPSG、PixelScale/Tiepoint、回転行列、PixelIsPoint。
- 同じフォルダ・ベース名のJ2W / JP2W / WLD、PRJ、JP2.AUX.XML。ZIP・フォルダ入力も可。
- 位置情報はAUX.XML → GeoJP2 → ワールドファイルの順。明示されたPRJは座標系を上書きする。
- 判別できるEPSGを既存の投影辞書（WGS84 UTMも含む）で変換する。独自GeoKey投影は座標系フォームで指定する。
- 座標系既知なら登録へ直行。座標系不明なら座標系フォーム、位置も不明なら画像の位置合わせへ進む。
- RGBの画素値・16bit値を保持し、再投影は最近傍。欠損値はNaNへ正規化する。
- 単バンドはグレースケールを初期表示とする。数値ラスターとして配色変更や既存の書き出しを使用できる。
- 共通スクリーンガード、キャンセル、120秒のWorkerタイムアウト。ファイルは外部へ送信しない。

## 制限

- 入力256 MiB、合計16,777,216サンプル、1バンドまたは3バンド、付属ファイル・GeoJP2のTIFFメタデータ各1 MiBまで。
- GMLJP2だけの座標情報、GCP/RPC、独自GeoKeyの投影パラメーターは自動解釈しない。位置合わせまたは付属ファイルを使う。
- ICC・YCC・パレット、成分ごとの異なる解像度や精度、アルファ付き画像は未対応として通知する。
- J2K単体、JPXの複数画像、HTJ2K、符号付き8bit以下・32bit整数・浮動小数点は対象外。
- 部分読み込みや解像度を落とした復号は行わない。大きい衛星画像は分割またはCOG変換を推奨。

## 検証

`__fixtures__/generate.mjs`で任意の座標・画素値から可逆圧縮のJP2を生成する。
OpenJPEGの実復号、RGB、符号付き/符号なし16bit、GeoJP2の投影、付属ファイル、壊れた入力を検証する。

## 参照

- [OpenJPEGのJS/WASMラッパー](https://github.com/cornerstonejs/codecs/tree/main/packages/openjpeg)
- [GDALによるGeoJP2・付属ファイルの説明](https://gdal.org/en/stable/drivers/raster/jp2openjpeg.html)
- ライセンス: `static/vendor/openjpeg/`。
