[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/vector](../README.md) / PolygonEntry

# Interface: PolygonEntry\<T\>

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:55](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L55)

## Extends

- `BaseVectorEntry`

## Type Parameters

### T

`T`

## Properties

### auxiliaryLayers?

> `optional` **auxiliaryLayers**: [`AuxiliaryLayersData`](AuxiliaryLayersData.md)

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:64](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L64)

***

### format

> **format**: `object`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:57](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L57)

#### data?

> `optional` **data**: `PolygonFeatureCollection`\<`FeatureProp`\>

#### geometryType

> **geometryType**: `"Polygon"`

#### type

> **type**: [`VectorFormatType`](../type-aliases/VectorFormatType.md)

#### url

> **url**: `string`

***

### id

> **id**: `string`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:49](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L49)

#### Inherited from

`BaseVectorEntry.id`

***

### interaction

> **interaction**: [`VectorInteraction`](VectorInteraction.md)

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:52](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L52)

#### Inherited from

`BaseVectorEntry.interaction`

***

### metaData

> **metaData**: `T`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:56](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L56)

***

### properties

> **properties**: `VectorProperties`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:51](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L51)

#### Inherited from

`BaseVectorEntry.properties`

***

### style

> **style**: `PolygonStyle`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:63](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L63)

***

### type

> **type**: `"vector"`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:50](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L50)

#### Inherited from

`BaseVectorEntry.type`
