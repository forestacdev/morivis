[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/feature\_state](../README.md) / FeatureStateManager

# Class: FeatureStateManager

Defined in: [frontend/src/routes/map/utils/feature\_state.ts:7](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/feature_state.ts#L7)

featureStateを管理するクラス

## Constructors

### Constructor

> **new FeatureStateManager**(): `FeatureStateManager`

#### Returns

`FeatureStateManager`

## Methods

### clear()

> `static` **clear**(): `void`

Defined in: [frontend/src/routes/map/utils/feature\_state.ts:26](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/feature_state.ts#L26)

#### Returns

`void`

***

### get()

> `static` **get**(`key`): [`FeatureStateData`](../interfaces/FeatureStateData.md) \| `undefined`

Defined in: [frontend/src/routes/map/utils/feature\_state.ts:16](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/feature_state.ts#L16)

#### Parameters

##### key

`string`

#### Returns

[`FeatureStateData`](../interfaces/FeatureStateData.md) \| `undefined`

***

### has()

> `static` **has**(`key`): `boolean`

Defined in: [frontend/src/routes/map/utils/feature\_state.ts:31](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/feature_state.ts#L31)

#### Parameters

##### key

`string`

#### Returns

`boolean`

***

### keys()

> `static` **keys**(): `IterableIterator`\<`string`\>

Defined in: [frontend/src/routes/map/utils/feature\_state.ts:36](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/feature_state.ts#L36)

#### Returns

`IterableIterator`\<`string`\>

***

### remove()

> `static` **remove**(`key`): `void`

Defined in: [frontend/src/routes/map/utils/feature\_state.ts:21](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/feature_state.ts#L21)

#### Parameters

##### key

`string`

#### Returns

`void`

***

### set()

> `static` **set**(`key`, `data`): `void`

Defined in: [frontend/src/routes/map/utils/feature\_state.ts:11](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/utils/feature_state.ts#L11)

#### Parameters

##### key

`string`

##### data

[`FeatureStateData`](../interfaces/FeatureStateData.md)

#### Returns

`void`
