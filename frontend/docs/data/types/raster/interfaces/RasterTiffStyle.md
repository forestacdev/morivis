[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/raster](../README.md) / RasterTiffStyle

# Interface: RasterTiffStyle

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:193](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/raster/index.ts#L193)

## Extends

- [`BaseRasterStyle`](BaseRasterStyle.md)

## Properties

### maxZoom?

> `optional` **maxZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:90](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/raster/index.ts#L90)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`maxZoom`](BaseRasterStyle.md#maxzoom)

***

### minZoom?

> `optional` **minZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:89](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/raster/index.ts#L89)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`minZoom`](BaseRasterStyle.md#minzoom)

***

### opacity

> **opacity**: [`Opacity`](../../type-aliases/Opacity.md)

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:87](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/raster/index.ts#L87)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`opacity`](BaseRasterStyle.md#opacity)

***

### resampling?

> `optional` **resampling**: `"nearest"` \| `"linear"`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:195](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/raster/index.ts#L195)

***

### type

> **type**: `"tiff"`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:194](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/raster/index.ts#L194)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:88](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/raster/index.ts#L88)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`visible`](BaseRasterStyle.md#visible)

***

### visualization

> **visualization**: `object`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:196](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/raster/index.ts#L196)

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
