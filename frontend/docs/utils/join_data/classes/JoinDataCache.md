[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/join\_data](../README.md) / JoinDataCache

# Class: JoinDataCache

Defined in: [frontend/src/routes/map/utils/join\_data.ts:2](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/join_data.ts#L2)

Join Dataのキャッシュを管理するクラス

## Constructors

### Constructor

> **new JoinDataCache**(): `JoinDataCache`

#### Returns

`JoinDataCache`

## Methods

### clear()

> `static` **clear**(): `void`

Defined in: [frontend/src/routes/map/utils/join\_data.ts:21](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/join_data.ts#L21)

#### Returns

`void`

***

### get()

> `static` **get**(`key`): `Record`\<`string`, `Record`\<`string`, `any`\>\> \| `undefined`

Defined in: [frontend/src/routes/map/utils/join\_data.ts:11](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/join_data.ts#L11)

#### Parameters

##### key

`string`

#### Returns

`Record`\<`string`, `Record`\<`string`, `any`\>\> \| `undefined`

***

### has()

> `static` **has**(`key`): `boolean`

Defined in: [frontend/src/routes/map/utils/join\_data.ts:26](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/join_data.ts#L26)

#### Parameters

##### key

`string`

#### Returns

`boolean`

***

### keys()

> `static` **keys**(): `IterableIterator`\<`string`\>

Defined in: [frontend/src/routes/map/utils/join\_data.ts:31](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/join_data.ts#L31)

#### Returns

`IterableIterator`\<`string`\>

***

### remove()

> `static` **remove**(`key`): `void`

Defined in: [frontend/src/routes/map/utils/join\_data.ts:16](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/join_data.ts#L16)

#### Parameters

##### key

`string`

#### Returns

`void`

***

### set()

> `static` **set**(`key`, `data`): `void`

Defined in: [frontend/src/routes/map/utils/join\_data.ts:6](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/join_data.ts#L6)

#### Parameters

##### key

`string`

##### data

`Record`\<`string`, `Record`\<`string`, `any`\>\>

#### Returns

`void`
