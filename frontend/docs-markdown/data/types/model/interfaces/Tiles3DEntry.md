[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/model](../README.md) / Tiles3DEntry

# Interface: Tiles3DEntry\<T\>

Defined in: [frontend/src/routes/map/data/types/model/index.ts:172](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L172)

## Extends

- `BaseModelEntry`

## Type Parameters

### T

`T`

## Properties

### format

> **format**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:173](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L173)

#### type

> **type**: `"3d-tiles"`

#### url

> **url**: `string`

***

### id

> **id**: `string`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:30](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L30)

#### Inherited from

`BaseModelEntry.id`

***

### interaction

> **interaction**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:39](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L39)

#### clickable

> **clickable**: `boolean`

#### Inherited from

`BaseModelEntry.interaction`

***

### metaData

> **metaData**: `ModelMetaData`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:32](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L32)

#### Inherited from

`BaseModelEntry.metaData`

***

### properties?

> `optional` **properties**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:33](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L33)

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

Defined in: [frontend/src/routes/map/data/types/model/index.ts:42](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L42)

#### animation?

> `optional` **animation**: [`ModelAnimationState`](ModelAnimationState.md)

#### dimension?

> `optional` **dimension**: [`SharedDimensionState`](../../interfaces/SharedDimensionState.md)

#### Inherited from

`BaseModelEntry.state`

***

### style

> **style**: `T`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:177](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L177)

***

### type

> **type**: `"model"`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:31](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L31)

#### Inherited from

`BaseModelEntry.type`
