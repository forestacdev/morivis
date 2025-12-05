
```sh
npx geo2topo -q 1e6 hoge=lite_prefectures_4326.geojson | npx toposimplify -p 0.0001 | npx topo2geo hoge=output.geojson | ogr2ogr -f "GeoJSON" -s_srs EPSG:4326 -t_srs EPSG:3857 lite_prefectures.geojson output.geojson
```

svg
```sh
node prefectures_svg.cjs 
``` 