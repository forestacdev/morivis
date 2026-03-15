[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/3dtiles](../README.md) / tiles3DToLngLatBounds

# Function: tiles3DToLngLatBounds()

> **tiles3DToLngLatBounds**(`tileset`): `LngLatBoundsLike` \| `null`

Defined in: [frontend/src/routes/map/utils/3dtiles.ts:145](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/utils/3dtiles.ts#L145)

tileset.jsonからLngLatBoundsを計算する（レガシー互換）

## Parameters

### tileset

#### root

\{ `boundingVolume`: \{ `box?`: `number`[]; `region?`: `number`[]; `sphere?`: `number`[]; \}; `transform?`: `number`[]; \}

#### root.boundingVolume

\{ `box?`: `number`[]; `region?`: `number`[]; `sphere?`: `number`[]; \}

#### root.boundingVolume.box?

`number`[]

#### root.boundingVolume.region?

`number`[]

#### root.boundingVolume.sphere?

`number`[]

#### root.transform?

`number`[]

## Returns

`LngLatBoundsLike` \| `null`
