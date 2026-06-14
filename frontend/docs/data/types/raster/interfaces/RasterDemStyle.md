[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/raster](../README.md) / RasterDemStyle

# Interface: RasterDemStyle

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:156](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/raster/index.ts#L156)

## Extends

- [`BaseRasterStyle`](BaseRasterStyle.md)

## Properties

### maxZoom?

> `optional` **maxZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:99](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/raster/index.ts#L99)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`maxZoom`](BaseRasterStyle.md#maxzoom)

***

### minZoom?

> `optional` **minZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:98](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/raster/index.ts#L98)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`minZoom`](BaseRasterStyle.md#minzoom)

***

### opacity

> **opacity**: [`Opacity`](../../type-aliases/Opacity.md)

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:96](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/raster/index.ts#L96)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`opacity`](BaseRasterStyle.md#opacity)

***

### type

> **type**: `"dem"`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:157](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/raster/index.ts#L157)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:97](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/raster/index.ts#L97)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`visible`](BaseRasterStyle.md#visible)

***

### visualization

> **visualization**: `object`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:158](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/raster/index.ts#L158)

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
