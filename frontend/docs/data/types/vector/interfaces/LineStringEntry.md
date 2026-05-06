[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/vector](../README.md) / LineStringEntry

# Interface: LineStringEntry\<T\>

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:67](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L67)

## Extends

- `BaseVectorEntry`

## Type Parameters

### T

`T`

## Properties

### auxiliaryLayers?

> `optional` **auxiliaryLayers**: [`AuxiliaryLayersData`](AuxiliaryLayersData.md)

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:76](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L76)

***

### format

> **format**: `object`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:69](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L69)

#### data?

> `optional` **data**: `LineStringFeatureCollection`\<`FeatureProp`\>

#### geometryType

> **geometryType**: `"LineString"`

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

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:68](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L68)

***

### properties

> **properties**: `VectorProperties`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:51](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L51)

#### Inherited from

`BaseVectorEntry.properties`

***

### style

> **style**: `LineStringStyle`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:75](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L75)

***

### type

> **type**: `"vector"`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:50](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/vector/index.ts#L50)

#### Inherited from

`BaseVectorEntry.type`
