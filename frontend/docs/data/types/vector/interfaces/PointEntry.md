[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/vector](../README.md) / PointEntry

# Interface: PointEntry\<T\>

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:72](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/vector/index.ts#L72)

## Extends

- `BaseVectorEntry`

## Type Parameters

### T

`T`

## Properties

### auxiliaryLayers?

> `optional` **auxiliaryLayers**: [`AuxiliaryLayersData`](AuxiliaryLayersData.md)

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:81](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/vector/index.ts#L81)

***

### format

> **format**: `object`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:74](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/vector/index.ts#L74)

#### data?

> `optional` **data**: `PointFeatureCollection`\<`FeatureProp`\>

#### geometryType

> **geometryType**: `"Point"`

#### type

> **type**: [`VectorFormatType`](../type-aliases/VectorFormatType.md)

#### url

> **url**: `string`

***

### id

> **id**: `string`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:42](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/vector/index.ts#L42)

#### Inherited from

`BaseVectorEntry.id`

***

### interaction

> **interaction**: [`VectorInteraction`](VectorInteraction.md)

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:45](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/vector/index.ts#L45)

#### Inherited from

`BaseVectorEntry.interaction`

***

### metaData

> **metaData**: `T`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:73](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/vector/index.ts#L73)

***

### properties

> **properties**: `VectorProperties`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:44](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/vector/index.ts#L44)

#### Inherited from

`BaseVectorEntry.properties`

***

### style

> **style**: `PointStyle`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:80](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/vector/index.ts#L80)

***

### type

> **type**: `"vector"`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:43](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/vector/index.ts#L43)

#### Inherited from

`BaseVectorEntry.type`
