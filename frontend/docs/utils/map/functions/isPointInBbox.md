[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/map](../README.md) / isPointInBbox

# Function: isPointInBbox()

> **isPointInBbox**(`point`, `bbox`): `boolean`

Defined in: [frontend/src/routes/map/utils/map.ts:41](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/utils/map.ts#L41)

Check if a point is inside a bounding box.

## Parameters

### point

`LngLat`

The point as maplibregl.LngLat.

### bbox

`BBox`

The bounding box as [minLng, minLat, maxLng, maxLat].

## Returns

`boolean`

true if the point is inside the bbox, false otherwise.
