[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/map](../README.md) / findCenterTile

# Function: findCenterTile()

> **findCenterTile**(`bbox`, `maxZoom`): [`TileXYZ`](../../../data/types/raster/interfaces/TileXYZ.md)

Defined in: [frontend/src/routes/map/utils/map.ts:71](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/map.ts#L71)

bboxの中心に最も近い、bboxより小さいタイル座標を求める。
ズームレベルを上げていき、タイルがbboxより小さくなった最初のタイルを返す。

## Parameters

### bbox

`BBox`

データのbbox [west, south, east, north]

### maxZoom

`number` = `18`

探索する最大ズームレベル（デフォルト: 18）

## Returns

[`TileXYZ`](../../../data/types/raster/interfaces/TileXYZ.md)
