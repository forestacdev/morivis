# pmtiles の生成 id の付与

```
tippecanoe -o mino_geology.pmtiles geo_A.geojson geo_L.geojson gfd.geojson pnt.geojson sec.geojson strdip.geojson -ai
```

https://qiita.com/Kanahiro/items/09abaa4ed80429b3ef28

# ラスタータイルから pmTiles を生成する

mbtiles に変換

```
gdal_translate input.tif output.mbtiles -of MBTILES
```

go-pmtiles のバイナリファイルをダウンロードして、以下のコマンドを実行する。

```
./pmtiles convert test.mbtiles test.pmtiles
```
