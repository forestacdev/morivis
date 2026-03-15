[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/3dtiles](../README.md) / fetchTileset3DBbox

# Function: fetchTileset3DBbox()

> **fetchTileset3DBbox**(`url`): `Promise`\<\[`number`, `number`, `number`, `number`\] \| `null`\>

Defined in: [frontend/src/routes/map/utils/3dtiles.ts:125](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/utils/3dtiles.ts#L125)

tileset.json URLからbboxを取得する

## Parameters

### url

`string`

tileset.jsonのURL

## Returns

`Promise`\<\[`number`, `number`, `number`, `number`\] \| `null`\>

[minLng, minLat, maxLng, maxLat] または null
