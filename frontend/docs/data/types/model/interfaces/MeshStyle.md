[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/model](../README.md) / MeshStyle

# Interface: MeshStyle

Defined in: [frontend/src/routes/map/data/types/model/index.ts:82](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L82)

## Properties

### color

> **color**: `string`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:87](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L87)

***

### heightColorRamp?

> `optional` **heightColorRamp**: [`MeshHeightColorRampStyle`](MeshHeightColorRampStyle.md)

Defined in: [frontend/src/routes/map/data/types/model/index.ts:90](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L90)

***

### opacity

> **opacity**: [`Opacity`](../../type-aliases/Opacity.md)

Defined in: [frontend/src/routes/map/data/types/model/index.ts:84](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L84)

***

### shading?

> `optional` **shading**: [`MeshShadingStyle`](MeshShadingStyle.md)

Defined in: [frontend/src/routes/map/data/types/model/index.ts:88](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L88)

***

### shadingOptions?

> `optional` **shadingOptions**: [`MeshShadingOptionStyle`](MeshShadingOptionStyle.md)

Defined in: [frontend/src/routes/map/data/types/model/index.ts:89](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L89)

***

### transform

> **transform**: `object`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:92](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L92)

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

Defined in: [frontend/src/routes/map/data/types/model/index.ts:91](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L91)

***

### type

> **type**: `"mesh"`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:83](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L83)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:85](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L85)

***

### wireframe

> **wireframe**: `boolean`

Defined in: [frontend/src/routes/map/data/types/model/index.ts:86](https://github.com/forestacdev/morivis/blob/c2bc8fb176171e3877586dcb7881ff237e3214f8/frontend/src/routes/map/data/types/model/index.ts#L86)
