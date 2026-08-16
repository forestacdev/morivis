[**morivis TypeDoc**](../../../../../README.md)

***

[morivis TypeDoc](../../../../../README.md) / [utils/maplibre](../../../README.md) / [Point](../README.md) / convert

# Function: convert()

> **convert**(`p`): [`Point`](../../../classes/Point.md)

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:209

Construct a point from an array if necessary, otherwise if the input
is already a Point, return it unchanged.

## Parameters

### p

input value

\[`number`, `number`\] | [`Point`](../../../classes/Point.md) | \{ `x`: `number`; `y`: `number`; \}

## Returns

[`Point`](../../../classes/Point.md)

constructed point.

## Example

```ts
// this
var point = Point.convert([0, 1]);
// is equivalent to
var point = new Point(0, 1);
```
