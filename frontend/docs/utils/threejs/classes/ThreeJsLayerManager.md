[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/threejs](../README.md) / ThreeJsLayerManager

# Class: ThreeJsLayerManager

Defined in: [frontend/src/routes/map/utils/threejs.ts:50](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L50)

Three.js レイヤーマネージャー
scene/camera/renderer は一度だけ初期化し、モデルの追加/削除のみを行う

## Constructors

### Constructor

> **new ThreeJsLayerManager**(): `ThreeJsLayerManager`

#### Returns

`ThreeJsLayerManager`

## Accessors

### initialized

#### Get Signature

> **get** **initialized**(): `boolean`

Defined in: [frontend/src/routes/map/utils/threejs.ts:424](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L424)

初期化済みかどうか

##### Returns

`boolean`

***

### modelIds

#### Get Signature

> **get** **modelIds**(): `string`[]

Defined in: [frontend/src/routes/map/utils/threejs.ts:431](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L431)

ロード済みモデルのIDリスト

##### Returns

`string`[]

## Methods

### addModel()

> **addModel**(`entry`, `_type`): `Promise`\<`void`\>

Defined in: [frontend/src/routes/map/utils/threejs.ts:160](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L160)

モデルを追加
プレビューに同じIDのモデルがあれば再利用する

#### Parameters

##### entry

[`ModelMeshEntry`](../../../data/types/model/interfaces/ModelMeshEntry.md)\<[`MeshStyle`](../../../data/types/model/interfaces/MeshStyle.md)\>

##### \_type

`"main"` | `"preview"`

#### Returns

`Promise`\<`void`\>

***

### addModels()

> **addModels**(`entries`): `Promise`\<`void`\>

Defined in: [frontend/src/routes/map/utils/threejs.ts:244](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L244)

複数のモデルを追加

#### Parameters

##### entries

[`ModelMeshEntry`](../../../data/types/model/interfaces/ModelMeshEntry.md)\<[`MeshStyle`](../../../data/types/model/interfaces/MeshStyle.md)\>[]

#### Returns

`Promise`\<`void`\>

***

### clearAllModels()

> **clearAllModels**(): `void`

Defined in: [frontend/src/routes/map/utils/threejs.ts:281](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L281)

すべてのモデルを削除

#### Returns

`void`

***

### clearPreview()

> **clearPreview**(`entryId?`): `void`

Defined in: [frontend/src/routes/map/utils/threejs.ts:386](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L386)

プレビューモデルをクリア（確定しない場合）

#### Parameters

##### entryId?

`string`

#### Returns

`void`

***

### createLayer()

> **createLayer**(): `CustomLayerInterface`

Defined in: [frontend/src/routes/map/utils/threejs.ts:63](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L63)

カスタムレイヤーを作成（初期化用）

#### Returns

`CustomLayerInterface`

***

### dispose()

> **dispose**(): `void`

Defined in: [frontend/src/routes/map/utils/threejs.ts:410](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L410)

完全に破棄（ページ離脱時など）

#### Returns

`void`

***

### promotePreviewToMain()

> **promotePreviewToMain**(`entryId`): `boolean`

Defined in: [frontend/src/routes/map/utils/threejs.ts:371](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L371)

プレビューモデルをメイングループに移動（再読み込み不要）

#### Parameters

##### entryId

`string`

#### Returns

`boolean`

***

### removeModel()

> **removeModel**(`entryId`): `void`

Defined in: [frontend/src/routes/map/utils/threejs.ts:261](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L261)

モデルを削除

#### Parameters

##### entryId

`string`

#### Returns

`void`

***

### replaceModels()

> **replaceModels**(`entries`): `Promise`\<`void`\>

Defined in: [frontend/src/routes/map/utils/threejs.ts:290](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L290)

モデルを入れ替え（既存をすべて削除して新しいモデルを追加）

#### Parameters

##### entries

[`ModelMeshEntry`](../../../data/types/model/interfaces/ModelMeshEntry.md)\<[`MeshStyle`](../../../data/types/model/interfaces/MeshStyle.md)\>[]

#### Returns

`Promise`\<`void`\>

***

### setGroupVisibility()

> **setGroupVisibility**(`visible`): `void`

Defined in: [frontend/src/routes/map/utils/threejs.ts:363](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L363)

#### Parameters

##### visible

`boolean`

#### Returns

`void`

***

### setModelColor()

> **setModelColor**(`entryId`, `color`): `void`

Defined in: [frontend/src/routes/map/utils/threejs.ts:347](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L347)

#### Parameters

##### entryId

`string`

##### color

`string`

#### Returns

`void`

***

### setModelOpacity()

> **setModelOpacity**(`entryId`, `opacity`): `void`

Defined in: [frontend/src/routes/map/utils/threejs.ts:316](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L316)

モデルの不透明度を変更

#### Parameters

##### entryId

`string`

##### opacity

`number`

#### Returns

`void`

***

### setModelVisibility()

> **setModelVisibility**(`entryId`, `visible`): `void`

Defined in: [frontend/src/routes/map/utils/threejs.ts:298](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L298)

モデルの表示/非表示を切り替え

#### Parameters

##### entryId

`string`

##### visible

`boolean`

#### Returns

`void`

***

### setModelWireframe()

> **setModelWireframe**(`entryId`, `wireframe`): `void`

Defined in: [frontend/src/routes/map/utils/threejs.ts:331](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L331)

#### Parameters

##### entryId

`string`

##### wireframe

`boolean`

#### Returns

`void`

***

### updateTransform()

> **updateTransform**(`entries`): `void`

Defined in: [frontend/src/routes/map/utils/threejs.ts:248](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/threejs.ts#L248)

#### Parameters

##### entries

[`ModelMeshEntry`](../../../data/types/model/interfaces/ModelMeshEntry.md)\<[`MeshStyle`](../../../data/types/model/interfaces/MeshStyle.md)\>[]

#### Returns

`void`
