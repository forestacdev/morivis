[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/tile](../README.md) / xyzToWMSXYZ

# Function: xyzToWMSXYZ()

> **xyzToWMSXYZ**(`tile`): [`TileXYZ`](../../../data/types/raster/interfaces/TileXYZ.md)

Defined in: [frontend/src/routes/map/utils/tile.ts:30](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/utils/tile.ts#L30)

タイル座標 (z/x/y) → WMS タイル座標 (z/x/y) に変換
WMSではY座標が左上原点であるため、通常のタイル座標とは異なる

## Parameters

### tile

[`TileXYZ`](../../../data/types/raster/interfaces/TileXYZ.md)

タイル座標 { x, y, z }

## Returns

[`TileXYZ`](../../../data/types/raster/interfaces/TileXYZ.md)

WMS タイル座標 { x, y, z }
