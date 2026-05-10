[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/model](../README.md) / ModelPointCloudEntry

# Interface: ModelPointCloudEntry

Defined in: [frontend/src/routes/map/data/types/model/index.ts:61](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/model/index.ts#L61)

## Extends

- `BaseModelEntry`

## Properties

### format

> **format**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:62](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/model/index.ts#L62)

#### colors?

> `optional` **colors**: `Uint8Array`\<`ArrayBufferLike`\>

色データ [r,g,b, r,g,b, ...] (0-255)

#### pointCount

> **pointCount**: `number`

点数

#### positions?

> `optional` **positions**: `Float32Array`\<`ArrayBufferLike`\>

変換済みの位置データ [x,y,z, x,y,z, ...]

#### type

> **type**: `"point-cloud"`

#### url?

> `optional` **url**: `string`

Blob URL of the LAS/LAZ file (未変換時)

***

### id

> **id**: `string`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:8](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/model/index.ts#L8)

#### Inherited from

`BaseModelEntry.id`

***

### interaction

> **interaction**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:11](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/model/index.ts#L11)

#### clickable

> **clickable**: `boolean`

#### Inherited from

`BaseModelEntry.interaction`

***

### metaData

> **metaData**: `ModelMetaData`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:10](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/model/index.ts#L10)

#### Inherited from

`BaseModelEntry.metaData`

***

### style

> **style**: [`PointCloudStyle`](PointCloudStyle.md)

Defined in: [frontend/src/routes/map/data/types/model/index.ts:73](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/model/index.ts#L73)

***

### type

> **type**: `"model"`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:9](https://github.com/forestacdev/morivis/blob/ee0f463664fecbbce3a97d40b1cff6b3f42251c5/frontend/src/routes/map/data/types/model/index.ts#L9)

#### Inherited from

`BaseModelEntry.type`
