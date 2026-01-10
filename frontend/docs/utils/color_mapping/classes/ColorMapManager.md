[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/color\_mapping](../README.md) / ColorMapManager

# Class: ColorMapManager

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:151](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/color_mapping.ts#L151)

## Constructors

### Constructor

> **new ColorMapManager**(): `ColorMapManager`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:153](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/color_mapping.ts#L153)

#### Returns

`ColorMapManager`

## Methods

### add()

> **add**(`cacheKey`, `pixels`): `void`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:246](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/color_mapping.ts#L246)

#### Parameters

##### cacheKey

`string`

##### pixels

`Uint8Array`

#### Returns

`void`

***

### createColorArray()

> **createColorArray**(`colorMapName`): `Uint8Array`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:156](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/color_mapping.ts#L156)

#### Parameters

##### colorMapName

`string`

#### Returns

`Uint8Array`

***

### createSimpleCSSGradient()

> **createSimpleCSSGradient**(`colorMapName`, `steps`, `direction`): `string`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:191](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/color_mapping.ts#L191)

#### Parameters

##### colorMapName

`string`

##### steps

`number` = `30`

##### direction

`string` = `'to right'`

#### Returns

`string`

***

### get()

> **get**(`cacheKey`): `Uint8Array`\<`ArrayBufferLike`\> \| `undefined`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:250](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/color_mapping.ts#L250)

#### Parameters

##### cacheKey

`string`

#### Returns

`Uint8Array`\<`ArrayBufferLike`\> \| `undefined`

***

### getMaxColor()

> **getMaxColor**(`colorMapName`, `format`): `string`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:234](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/color_mapping.ts#L234)

カラーマップの最大値の色を取得

#### Parameters

##### colorMapName

`string`

カラーマップ名

##### format

出力フォーマット ('hex' | 'rgb' | 'rgba')

`"hex"` | `"rgb"` | `"rgba"`

#### Returns

`string`

最大値の色

***

### getMinColor()

> **getMinColor**(`colorMapName`, `format`): `string`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:216](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/color_mapping.ts#L216)

カラーマップの最小値の色を取得

#### Parameters

##### colorMapName

`string`

カラーマップ名

##### format

出力フォーマット ('hex' | 'rgb' | 'rgba')

`"hex"` | `"rgb"` | `"rgba"`

#### Returns

`string`

最小値の色

***

### has()

> **has**(`cacheKey`): `boolean`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:254](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/color_mapping.ts#L254)

#### Parameters

##### cacheKey

`string`

#### Returns

`boolean`
