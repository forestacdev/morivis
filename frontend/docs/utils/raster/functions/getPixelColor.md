[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/raster](../README.md) / getPixelColor

# Function: getPixelColor()

> **getPixelColor**(`url`, `lngLat`, `zoom`, `tileSize`, `type`): `Promise`\<`string` \| `null`\>

Defined in: [frontend/src/routes/map/utils/raster.ts:48](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/utils/raster.ts#L48)

タイル画像のピクセル色を取得

## Parameters

### url

`string`

### lngLat

`LngLat`

### zoom

[`ZoomLevel`](../../../data/types/raster/type-aliases/ZoomLevel.md)

### tileSize

[`TileSize`](../../../data/types/raster/type-aliases/TileSize.md)

### type

[`RasterFormatType`](../../../data/types/raster/type-aliases/RasterFormatType.md)

## Returns

`Promise`\<`string` \| `null`\>
