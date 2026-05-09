# `_spec` URL 調査メモ

## 結論

- `nendophoto2021_spec` は画像ではなく GeoJSON の撮影範囲レイヤ
- コード上では `maxNativeZoom: 2` が効くため、表示ズームが 13 以下でも実際の取得先は `z=2` のタイルになる
- そのため、日本付近では `https://maps.gsi.go.jp/xyz/nendophoto2021/2/3/1.geojson` のような URL しか当たりにくい

## `nendophoto2021_spec` の定義

定義箇所:

- [layers_txt/layers1.txt](/Users/satoshi/Documents/GitHub/gsimaps/layers_txt/layers1.txt:154)

定義内容:

```json
{
  "type": "Layer",
  "id": "nendophoto2021_spec",
  "title": "2021年",
  "url": "https://maps.gsi.go.jp/xyz/nendophoto2021/{z}/{x}/{y}.geojson",
  "cocotile": false,
  "minZoom": 2,
  "maxZoom": 13,
  "maxNativeZoom": 2
}
```

## コード上の挙動

`maxNativeZoom` は GeoJSON タイル生成時にそのまま `options.maxNativeZoom` に入る。

- [js/gsimaps.js](/Users/satoshi/Documents/GitHub/gsimaps/js/gsimaps.js:8799)

URL に使うズーム値は `Math.min(zoom, options.maxNativeZoom)` で丸められる。

- [js/gsimaps.js](/Users/satoshi/Documents/GitHub/gsimaps/js/gsimaps.js:20821)
- [js/gsimaps.js](/Users/satoshi/Documents/GitHub/gsimaps/js/gsimaps.js:20832)

さらに `_adjustTilePoint` で `tilePoint.z` もその値に置き換えられる。

- [js/gsimaps.js](/Users/satoshi/Documents/GitHub/gsimaps/js/gsimaps.js:20862)
- [js/gsimaps.js](/Users/satoshi/Documents/GitHub/gsimaps/js/gsimaps.js:20875)

つまり `nendophoto2021_spec` は:

- 画面上の表示ズーム: 2〜13
- 実際に取りに行くネイティブズーム: 2

という動きになる。

## `_spec` URL 一覧

### `maxNativeZoom: 2`

- `https://maps.gsi.go.jp/xyz/nendophoto2007/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2008/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2009/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2010/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2011/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2012/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2013/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2014/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2015/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2016/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2017/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2018/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2019/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2020/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2021/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2022/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2023/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/nendophoto2024/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/ort_spec/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/southpole_2500_spec/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/southpole_25000_spec/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/southpole_satellite_250000_spec/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/southpole_250000_spec/{z}/{x}/{y}.geojson`

### `maxNativeZoom: 11`

- `https://maps.gsi.go.jp/xyz/seamlessphoto_spec/{z}/{x}/{y}.geojson`

### `maxNativeZoom` 未確認

今回の確認範囲では URL だけ拾い、ズーム定義は掘っていないもの。

- `https://maps.gsi.go.jp/xyz/afm_spec/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/lcm25k_spec/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/vbmd_spec/{z}/{x}/{y}.geojson`
- `https://maps.gsi.go.jp/xyz/lakedata_spec/{z}/{x}/{y}.geojson`

## 参考

`seamlessphoto_spec` の定義:

- [layers_txt/layers1.txt](/Users/satoshi/Documents/GitHub/gsimaps/layers_txt/layers1.txt:33)

`ort_spec` の定義:

- [layers_txt/layers1.txt](/Users/satoshi/Documents/GitHub/gsimaps/layers_txt/layers1.txt:692)

## 日本付近で当たりやすい `z/x/y`

代表点として東京、札幌、福岡、那覇で計算した。

### `maxNativeZoom: 2` のもの

対象:

- `nendophoto2007_spec` 〜 `nendophoto2024_spec`
- `ort_spec`

結果:

| 地点 | タイル座標 |
| --- | --- |
| 東京 | `2/3/1` |
| 札幌 | `2/3/1` |
| 福岡 | `2/3/1` |
| 那覇 | `2/3/1` |

さらに端点に近い地点でも同じだった。

| 地点 | タイル座標 |
| --- | --- |
| 稚内 | `2/3/1` |
| 根室 | `2/3/1` |
| 与那国 | `2/3/1` |
| 南鳥島 | `2/3/1` |

このため、日本付近に限れば `maxNativeZoom: 2` の `_spec` レイヤは、実質かなりの確率で `2/3/1` を見に行く。

### `maxNativeZoom: 11` のもの

対象:

- `seamlessphoto_spec`

結果:

| 地点 | タイル座標 |
| --- | --- |
| 東京 | `11/1819/806` |
| 札幌 | `11/1828/752` |
| 福岡 | `11/1765/820` |
| 那覇 | `11/1750/869` |

端点に近い地点ではこうなる。

| 地点 | タイル座標 |
| --- | --- |
| 稚内 | `11/1829/733` |
| 根室 | `11/1852/749` |
| 与那国 | `11/1723/880` |
| 南鳥島 | `11/1899/881` |

つまり `seamlessphoto_spec` は、日本の中でも場所ごとに別タイルを見に行く。
