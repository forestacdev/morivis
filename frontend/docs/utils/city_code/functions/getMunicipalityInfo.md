[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/city\_code](../README.md) / getMunicipalityInfo

# Function: getMunicipalityInfo()

> **getMunicipalityInfo**(`code`): [`MunicipalityInfo`](../interfaces/MunicipalityInfo.md) \| `undefined`

Defined in: [frontend/src/routes/map/utils/city\_code/index.ts:60](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/utils/city_code/index.ts#L60)

団体コードから自治体情報を取得

## Parameters

### code

`string`

団体コード（5桁または6桁）

## Returns

[`MunicipalityInfo`](../interfaces/MunicipalityInfo.md) \| `undefined`

自治体情報、存在しない場合はundefined
