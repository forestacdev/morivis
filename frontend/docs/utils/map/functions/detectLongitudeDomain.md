[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/map](../README.md) / detectLongitudeDomain

# Function: detectLongitudeDomain()

> **detectLongitudeDomain**(`first`, `last`): `"180"` \| `"360"` \| `"indeterminate"`

Defined in: [frontend/src/routes/map/utils/map.ts:194](https://github.com/forestacdev/morivis/blob/cc07142120a2d9d2cc2b58138f57a8201cfd4796/frontend/src/routes/map/utils/map.ts#L194)

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
