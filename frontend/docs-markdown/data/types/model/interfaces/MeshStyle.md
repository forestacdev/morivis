[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/model](../README.md) / MeshStyle

# Interface: MeshStyle

Defined in: [frontend/src/routes/map/data/types/model/index.ts:93](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L93)

## Properties

### color

> **color**: `string`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:98](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L98)

***

### heightColorRamp?

> `optional` **heightColorRamp**: [`MeshHeightColorRampStyle`](MeshHeightColorRampStyle.md)

Defined in: [frontend/src/routes/map/data/types/model/index.ts:101](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L101)

***

### opacity

> **opacity**: [`Opacity`](../../type-aliases/Opacity.md)

Defined in: [frontend/src/routes/map/data/types/model/index.ts:95](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L95)

***

### shading?

> `optional` **shading**: [`MeshShadingStyle`](MeshShadingStyle.md)

Defined in: [frontend/src/routes/map/data/types/model/index.ts:99](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L99)

***

### shadingOptions?

> `optional` **shadingOptions**: [`MeshShadingOptionStyle`](MeshShadingOptionStyle.md)

Defined in: [frontend/src/routes/map/data/types/model/index.ts:100](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L100)

***

### transform

> **transform**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:103](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L103)

#### altitude

> **altitude**: `number`

#### baseRotationX?

> `optional` **baseRotationX**: `number`

UI には出さない読み込み基準の回転

#### baseRotationY?

> `optional` **baseRotationY**: `number`

#### baseRotationZ?

> `optional` **baseRotationZ**: `number`

#### baseScale?

> `optional` **baseScale**: `number`

UI には出さない読み込み基準のスケール

#### heightOffset?

> `optional` **heightOffset**: `number`

高さオフセット（常に適用、地形時はaltitude+heightOffset）

#### heightScale?

> `optional` **heightScale**: `number`

Y 方向だけに効く高さ倍率

#### lat

> **lat**: `number`

#### lng

> **lng**: `number`

#### rotationX

> **rotationX**: `number`

#### rotationY

> **rotationY**: `number`

#### rotationZ

> **rotationZ**: `number`

#### scale

> **scale**: `number`

***

### transformOptions?

> `optional` **transformOptions**: [`MeshTransformOptionStyle`](MeshTransformOptionStyle.md)

Defined in: [frontend/src/routes/map/data/types/model/index.ts:102](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L102)

***

### type

> **type**: `"mesh"`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:94](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L94)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:96](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L96)

***

### wireframe

> **wireframe**: `boolean`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:97](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/model/index.ts#L97)
