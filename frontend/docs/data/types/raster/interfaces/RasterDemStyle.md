[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/raster](../README.md) / RasterDemStyle

# Interface: RasterDemStyle

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:147](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/raster/index.ts#L147)

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

### type

> **type**: `"dem"`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:148](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/raster/index.ts#L148)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:88](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/raster/index.ts#L88)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`visible`](BaseRasterStyle.md#visible)

***

### visualization

> **visualization**: `object`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:149](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/raster/index.ts#L149)

#### demType

> **demType**: `"mapbox"` \| `"gsi"` \| `"terrarium"`

#### mode

> **mode**: `"default"` \| `"relief"` \| `"slope"` \| `"aspect"` \| `"curvature"` \| `"shadow"`

#### uniformsData

> **uniformsData**: `object`

##### uniformsData.aspect?

> `optional` **aspect**: `object`

##### uniformsData.aspect.colorMap

> **colorMap**: [`ColorMapType`](../type-aliases/ColorMapType.md)

##### uniformsData.curvature?

> `optional` **curvature**: `object`

##### uniformsData.curvature.colorMap

> **colorMap**: [`ColorMapType`](../type-aliases/ColorMapType.md)

##### uniformsData.relief

> **relief**: [`DemRangeColorStyle`](../type-aliases/DemRangeColorStyle.md)

##### uniformsData.slope?

> `optional` **slope**: [`DemRangeColorStyle`](../type-aliases/DemRangeColorStyle.md)
