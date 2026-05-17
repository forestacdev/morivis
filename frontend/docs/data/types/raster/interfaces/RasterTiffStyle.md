[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/raster](../README.md) / RasterTiffStyle

# Interface: RasterTiffStyle

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:211](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/raster/index.ts#L211)

## Extends

- [`BaseRasterStyle`](BaseRasterStyle.md)

## Properties

### maxZoom?

> `optional` **maxZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:81](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/raster/index.ts#L81)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`maxZoom`](BaseRasterStyle.md#maxzoom)

***

### minZoom?

> `optional` **minZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:80](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/raster/index.ts#L80)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`minZoom`](BaseRasterStyle.md#minzoom)

***

### opacity

> **opacity**: [`Opacity`](../../type-aliases/Opacity.md)

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:78](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/raster/index.ts#L78)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`opacity`](BaseRasterStyle.md#opacity)

***

### resampling?

> `optional` **resampling**: `"nearest"` \| `"linear"`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:213](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/raster/index.ts#L213)

***

### type

> **type**: `"tiff"`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:212](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/raster/index.ts#L212)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:79](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/raster/index.ts#L79)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`visible`](BaseRasterStyle.md#visible)

***

### visualization

> **visualization**: `object`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:214](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/raster/index.ts#L214)

#### mode

> **mode**: [`BandTypeKey`](../type-aliases/BandTypeKey.md)

#### uniformsData

> **uniformsData**: `object`

##### uniformsData.multi

> **multi**: [`MultiBandData`](MultiBandData.md)

##### uniformsData.single

> **single**: [`ShingleBandData`](ShingleBandData.md)
