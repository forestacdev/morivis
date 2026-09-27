# gdal3.js 2.8.1

MapInfo TABの読み込みに使用する、未変更のgdal3.jsとWASM。
ViteがnpmパッケージのJavaScript・WASM・dataを使用時に読み込むアセットとして出力する。

- ライセンス: LGPL-2.1-or-later（同梱のLICENSE.txt）
- ソース・ビルド手順・各依存ライブラリのライセンス: https://github.com/bugra9/gdal3.js
- 使用パッケージ: https://registry.npmjs.org/gdal3.js/-/gdal3.js-2.8.1.tgz
- GDAL 3.8.4: https://github.com/OSGeo/gdal/tree/v3.8.4
- PROJ 9.3.1: https://github.com/OSGeo/PROJ/tree/9.3.1
- GEOS 3.12.1: https://github.com/libgeos/geos/tree/3.12.1
- その他の同梱ライブラリ（Spatialite・SQLite・GeoTIFF・TIFF・WebP・Expat・zlib・iconv）のバージョンとソース参照は上記gdal3.jsのREADMEに記載されている。

ライブラリ本体は変更していない。morivis側の呼び出しは `utils/formats/mapinfo-tab/` のWorkerに分離している。
