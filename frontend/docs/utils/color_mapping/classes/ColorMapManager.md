[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/color\_mapping](../README.md) / ColorMapManager

# Class: ColorMapManager

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:151](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/color_mapping.ts#L151)

## Constructors

### Constructor

> **new ColorMapManager**(): `ColorMapManager`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:153](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/color_mapping.ts#L153)

#### Returns

`ColorMapManager`

## Methods

### add()

> **add**(`cacheKey`, `pixels`): `void`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:367](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/color_mapping.ts#L367)

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

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:167](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/color_mapping.ts#L167)

#### Parameters

##### colorMapName

`string`

#### Returns

`Uint8Array`

***

### createSimpleCSSGradient()

> **createSimpleCSSGradient**(`colorMapName`, `steps`, `direction`): `string`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:202](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/color_mapping.ts#L202)

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

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:371](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/color_mapping.ts#L371)

#### Parameters

##### cacheKey

`string`

#### Returns

`Uint8Array`\<`ArrayBufferLike`\> \| `undefined`

***

### getMaxColor()

> **getMaxColor**(`colorMapName`, `format`): `string`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:245](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/color_mapping.ts#L245)

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

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:227](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/color_mapping.ts#L227)

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

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:375](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/color_mapping.ts#L375)

#### Parameters

##### cacheKey

`string`

#### Returns

`boolean`

***

### registerCustomColorMap()

> **registerCustomColorMap**(`name`, `values`, `colors`): `void`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:269](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/color_mapping.ts#L269)

数値と色の配列から自作カラーマップを作成しキャッシュに登録する

#### Parameters

##### name

`string`

カラーマップ名

##### values

`number`[]

数値配列（昇順）

##### colors

`string`[]

HEXカラー配列（valuesと同じ長さ）

#### Returns

`void`

#### Example

```ts
manager.registerCustomColorMap(
  'elevation',
  [0, 300, 1000, 2000, 4000],
  ['#46BABA', '#B5A42D', '#B4562D', '#B4491C', '#B43D09']
);
```

***

### registerThreeColorGradient()

> **registerThreeColorGradient**(`name`, `minColor`, `midColor`, `maxColor`): `void`

Defined in: [frontend/src/routes/map/utils/color\_mapping.ts:325](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/color_mapping.ts#L325)

3色グラデーション（min→mid→max）のカラーマップテクスチャを作成しキャッシュに登録する
シェーダーのcolorRamp3と同じ色分布になる

#### Parameters

##### name

`string`

カラーマップ名

##### minColor

`string`

HEXカラー（0.0側）

##### midColor

`string`

HEXカラー（0.5）

##### maxColor

`string`

HEXカラー（1.0側）

#### Returns

`void`
