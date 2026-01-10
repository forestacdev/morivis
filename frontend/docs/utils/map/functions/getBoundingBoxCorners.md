[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/map](../README.md) / getBoundingBoxCorners

# Function: getBoundingBoxCorners()

> **getBoundingBoxCorners**(`bbox`): `Coordinates`

Defined in: [frontend/src/routes/map/utils/map.ts:121](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/map.ts#L121)

[minLon, minLat, maxLon, maxLat] の形式のバウンディングボックスから、
その4隅の座標ペアの配列 [[minLon, minLat], [maxLon, maxLat], [maxLon, minLat], [minLon, minLat]] を生成。

## Parameters

### bbox

`BBox`

[最小経度, 最小緯度, 最大経度, 最大緯度] の形式の配列 (バウンディングボックス)

## Returns

`Coordinates`

バウンディングボックスの4隅の座標ペアの配列
