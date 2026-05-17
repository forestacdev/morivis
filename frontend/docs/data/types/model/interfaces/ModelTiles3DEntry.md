[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/model](../README.md) / ModelTiles3DEntry

# Interface: ModelTiles3DEntry\<T\>

Defined in: [frontend/src/routes/map/data/types/model/index.ts:131](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L131)

## Extends

- `BaseModelEntry`

## Type Parameters

### T

`T`

## Properties

### format

> **format**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:132](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L132)

#### type

> **type**: `"3d-tiles"`

#### url

> **url**: `string`

***

### id

> **id**: `string`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:27](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L27)

#### Inherited from

`BaseModelEntry.id`

***

### interaction

> **interaction**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:36](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L36)

#### clickable

> **clickable**: `boolean`

#### Inherited from

`BaseModelEntry.interaction`

***

### metaData

> **metaData**: `ModelMetaData`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:29](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L29)

#### Inherited from

`BaseModelEntry.metaData`

***

### properties?

> `optional` **properties**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:30](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L30)

#### animation?

> `optional` **animation**: [`ModelAnimationProperties`](ModelAnimationProperties.md)

#### temporal?

> `optional` **temporal**: `object`

##### temporal.dimension

> **dimension**: [`RasterDiscreteDimension`](../../raster/interfaces/RasterDiscreteDimension.md)

#### Inherited from

`BaseModelEntry.properties`

***

### state?

> `optional` **state**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:39](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L39)

#### animation?

> `optional` **animation**: [`ModelAnimationState`](ModelAnimationState.md)

#### dimension?

> `optional` **dimension**: [`RasterDimensionState`](../../raster/interfaces/RasterDimensionState.md)

#### Inherited from

`BaseModelEntry.state`

***

### style

> **style**: `T`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:136](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L136)

***

### type

> **type**: `"model"`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:28](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L28)

#### Inherited from

`BaseModelEntry.type`
