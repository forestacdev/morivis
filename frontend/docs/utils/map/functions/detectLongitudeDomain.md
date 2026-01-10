[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/map](../README.md) / detectLongitudeDomain

# Function: detectLongitudeDomain()

> **detectLongitudeDomain**(`first`, `last`): `"180"` \| `"360"` \| `"indeterminate"`

Defined in: [frontend/src/routes/map/utils/map.ts:164](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/utils/map.ts#L164)

Detect the longitude domain based on the first and last longitude values.

https://github.com/cf-convention/cf-conventions/issues/435?utm_source=chatgpt.com

## Parameters

### first

`number`

The first longitude value.

### last

`number`

The last longitude value.

## Returns

`"180"` \| `"360"` \| `"indeterminate"`

'180' if both values are in the range [0, 180], '360' if both are in [0, 360], or 'indeterminate' otherwise.
