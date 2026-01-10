[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/map](../README.md) / isPointInBbox

# Function: isPointInBbox()

> **isPointInBbox**(`point`, `bbox`): `boolean`

Defined in: [frontend/src/routes/map/utils/map.ts:39](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/map.ts#L39)

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
