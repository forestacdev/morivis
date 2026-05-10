[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/raster](../README.md) / RasterTiffStyle

# Interface: RasterTiffStyle

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:230](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/raster/index.ts#L230)

## Extends

- [`BaseRasterStyle`](BaseRasterStyle.md)

## Properties

### dimension?

> `optional` **dimension**: [`RasterDiscreteDimension`](RasterDiscreteDimension.md)

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:82](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/raster/index.ts#L82)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`dimension`](BaseRasterStyle.md#dimension)

***

### maxZoom?

> `optional` **maxZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:81](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/raster/index.ts#L81)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`maxZoom`](BaseRasterStyle.md#maxzoom)

***

### minZoom?

> `optional` **minZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:80](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/raster/index.ts#L80)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`minZoom`](BaseRasterStyle.md#minzoom)

***

### opacity

> **opacity**: [`Opacity`](../../type-aliases/Opacity.md)

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:78](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/raster/index.ts#L78)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`opacity`](BaseRasterStyle.md#opacity)

***

### resampling?

> `optional` **resampling**: `"nearest"` \| `"linear"`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:232](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/raster/index.ts#L232)

***

### type

> **type**: `"tiff"`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:231](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/raster/index.ts#L231)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:79](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/raster/index.ts#L79)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`visible`](BaseRasterStyle.md#visible)

***

### visualization

> **visualization**: `object`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:233](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/raster/index.ts#L233)

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
