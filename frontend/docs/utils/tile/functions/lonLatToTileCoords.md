[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/tile](../README.md) / lonLatToTileCoords

# Function: lonLatToTileCoords()

> **lonLatToTileCoords**(`lon`, `lat`, `zoom`): `object`

Defined in: [frontend/src/routes/map/utils/tile.ts:10](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/utils/tile.ts#L10)

経度・緯度 → タイル座標 (z/x/y) に変換

## Parameters

### lon

`number`

経度（-180 〜 180）

### lat

`number`

緯度（-85 〜 85）

### zoom

`number` = `14`

ズームレベル（デフォルト 14）

## Returns

`object`

タイル座標 { x, y, z }

### x

> **x**: `number`

### y

> **y**: `number`

### z

> **z**: `number`
