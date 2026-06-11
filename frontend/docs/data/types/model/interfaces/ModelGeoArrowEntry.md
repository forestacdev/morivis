[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/model](../README.md) / ModelGeoArrowEntry

# Interface: ModelGeoArrowEntry

Defined in: [frontend/src/routes/map/data/types/model/index.ts:177](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/model/index.ts#L177)

## Extends

- `BaseModelEntry`

## Properties

### format

> **format**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:178](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/model/index.ts#L178)

#### geometryType

> **geometryType**: [`VectorEntryGeometryType`](../../vector/type-aliases/VectorEntryGeometryType.md)

#### table

> **table**: `Table`

#### type

> **type**: `"geoarrow"`

***

### id

> **id**: `string`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:30](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/model/index.ts#L30)

#### Inherited from

`BaseModelEntry.id`

***

### interaction

> **interaction**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:39](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/model/index.ts#L39)

#### clickable

> **clickable**: `boolean`

#### Inherited from

`BaseModelEntry.interaction`

***

### metaData

> **metaData**: `ModelMetaData`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:32](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/model/index.ts#L32)

#### Inherited from

`BaseModelEntry.metaData`

***

### properties?

> `optional` **properties**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:33](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/model/index.ts#L33)

#### animation?

> `optional` **animation**: [`ModelAnimationProperties`](ModelAnimationProperties.md)

#### temporal?

> `optional` **temporal**: `object`

##### temporal.dimension

> **dimension**: [`SharedDiscreteDimension`](../../interfaces/SharedDiscreteDimension.md)

#### Inherited from

`BaseModelEntry.properties`

***

### state?

> `optional` **state**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:42](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/model/index.ts#L42)

#### animation?

> `optional` **animation**: [`ModelAnimationState`](ModelAnimationState.md)

#### dimension?

> `optional` **dimension**: [`SharedDimensionState`](../../interfaces/SharedDimensionState.md)

#### Inherited from

`BaseModelEntry.state`

***

### style

> **style**: [`GeoArrowStyle`](GeoArrowStyle.md)

Defined in: [frontend/src/routes/map/data/types/model/index.ts:183](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/model/index.ts#L183)

***

### type

> **type**: `"model"`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:31](https://github.com/forestacdev/morivis/blob/f56763847073a1ce9f103de49af249e6cc5bb3ce/frontend/src/routes/map/data/types/model/index.ts#L31)

#### Inherited from

`BaseModelEntry.type`
