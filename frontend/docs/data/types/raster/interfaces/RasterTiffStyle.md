[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/raster](../README.md) / RasterTiffStyle

# Interface: RasterTiffStyle

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:228](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/data/types/raster/index.ts#L228)

## Extends

- [`BaseRasterStyle`](BaseRasterStyle.md)

## Properties

### maxZoom?

> `optional` **maxZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:80](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/data/types/raster/index.ts#L80)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`maxZoom`](BaseRasterStyle.md#maxzoom)

***

### minZoom?

> `optional` **minZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:79](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/data/types/raster/index.ts#L79)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`minZoom`](BaseRasterStyle.md#minzoom)

***

### opacity

> **opacity**: [`Opacity`](../../type-aliases/Opacity.md)

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:77](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/data/types/raster/index.ts#L77)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`opacity`](BaseRasterStyle.md#opacity)

***

### type

> **type**: `"tiff"`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:229](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/data/types/raster/index.ts#L229)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:78](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/data/types/raster/index.ts#L78)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`visible`](BaseRasterStyle.md#visible)

***

### visualization

> **visualization**: `object`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:230](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/data/types/raster/index.ts#L230)

#### mode

> **mode**: [`BandTypeKey`](../type-aliases/BandTypeKey.md)

#### numBands

> **numBands**: `number`

#### uniformsData

> **uniformsData**: `object`

##### uniformsData.multi

> **multi**: [`MultiBandData`](MultiBandData.md)

##### uniformsData.single

> **single**: [`ShingleBandData`](ShingleBandData.md)
