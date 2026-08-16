[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/raster](../README.md) / RasterTiffStyle

# Interface: RasterTiffStyle

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:202](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/raster/index.ts#L202)

## Extends

- [`BaseRasterStyle`](BaseRasterStyle.md)

## Properties

### maxZoom?

> `optional` **maxZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:99](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/raster/index.ts#L99)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`maxZoom`](BaseRasterStyle.md#maxzoom)

***

### minZoom?

> `optional` **minZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:98](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/raster/index.ts#L98)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`minZoom`](BaseRasterStyle.md#minzoom)

***

### opacity

> **opacity**: [`Opacity`](../../type-aliases/Opacity.md)

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:96](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/raster/index.ts#L96)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`opacity`](BaseRasterStyle.md#opacity)

***

### resampling?

> `optional` **resampling**: `"nearest"` \| `"linear"`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:204](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/raster/index.ts#L204)

***

### type

> **type**: `"tiff"`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:203](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/raster/index.ts#L203)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:97](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/raster/index.ts#L97)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`visible`](BaseRasterStyle.md#visible)

***

### visualization

> **visualization**: `object`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:205](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/raster/index.ts#L205)

#### mode

> **mode**: [`BandTypeKey`](../type-aliases/BandTypeKey.md)

#### uniformsData

> **uniformsData**: `object`

##### uniformsData.aspect?

> `optional` **aspect**: [`DerivedBandData`](DerivedBandData.md)

##### uniformsData.multi

> **multi**: [`MultiBandData`](MultiBandData.md)

##### uniformsData.single

> **single**: [`ShingleBandData`](ShingleBandData.md)

##### uniformsData.slope?

> `optional` **slope**: [`DerivedBandData`](DerivedBandData.md)

##### uniformsData.topex?

> `optional` **topex**: [`DerivedBandData`](DerivedBandData.md)

##### uniformsData.tpi?

> `optional` **tpi**: [`DerivedBandData`](DerivedBandData.md)

##### uniformsData.twi?

> `optional` **twi**: [`DerivedBandData`](DerivedBandData.md)
