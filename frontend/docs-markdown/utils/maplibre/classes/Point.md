[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [utils/maplibre](../README.md) / Point

# Class: Point

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:12

A standalone point geometry with useful accessor, comparison, and
modification methods.

## Param

the x-coordinate. This could be longitude or screen pixels, or any other sort of unit.

## Param

the y-coordinate. This could be latitude or screen pixels, or any other sort of unit.

## Example

```ts
const point = new Point(-77, 38);
```

## Constructors

### Constructor

> **new Point**(`x`, `y`): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:25

A standalone point geometry with useful accessor, comparison, and
modification methods.

#### Parameters

##### x

`number`

the x-coordinate. This could be longitude or screen pixels, or any other sort of unit.

##### y

`number`

the y-coordinate. This could be latitude or screen pixels, or any other sort of unit.

#### Returns

`Point`

#### Example

```ts
const point = new Point(-77, 38);
```

## Properties

### x

> **x**: `number`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:26

***

### y

> **y**: `number`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:27

## Methods

### \_add()

> **\_add**(`p`): `this`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:175

#### Parameters

##### p

`Point`

#### Returns

`this`

***

### \_div()

> **\_div**(`k`): `this`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:181

#### Parameters

##### k

`number`

#### Returns

`this`

***

### \_divByPoint()

> **\_divByPoint**(`p`): `this`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:185

#### Parameters

##### p

`Point`

#### Returns

`this`

***

### \_matMult()

> **\_matMult**(`m`): `this`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:173

#### Parameters

##### m

\[`number`, `number`, `number`, `number`\]

#### Returns

`this`

***

### \_mult()

> **\_mult**(`k`): `this`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:179

#### Parameters

##### k

`number`

#### Returns

`this`

***

### \_multByPoint()

> **\_multByPoint**(`p`): `this`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:183

#### Parameters

##### p

`Point`

#### Returns

`this`

***

### \_perp()

> **\_perp**(): `this`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:187

#### Returns

`this`

***

### \_rotate()

> **\_rotate**(`angle`): `this`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:189

#### Parameters

##### angle

`number`

#### Returns

`this`

***

### \_rotateAround()

> **\_rotateAround**(`angle`, `p`): `this`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:194

#### Parameters

##### angle

`number`

##### p

`Point`

#### Returns

`this`

***

### \_round()

> **\_round**(): `this`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:195

#### Returns

`this`

***

### \_sub()

> **\_sub**(`p`): `this`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:177

#### Parameters

##### p

`Point`

#### Returns

`this`

***

### \_unit()

> **\_unit**(): `this`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:186

#### Returns

`this`

***

### add()

> **add**(`p`): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:40

Add this point's x & y coordinates to another point,
yielding a new point.

#### Parameters

##### p

`Point`

the other point

#### Returns

`Point`

output point

***

### angle()

> **angle**(): `number`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:151

Get the angle from the 0, 0 coordinate to this point, in radians
coordinates.

#### Returns

`number`

angle

***

### angleTo()

> **angleTo**(`b`): `number`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:157

Get the angle from this point to another point, in radians

#### Parameters

##### b

`Point`

the other point

#### Returns

`number`

angle

***

### angleWith()

> **angleWith**(`b`): `number`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:163

Get the angle between this point and another point, in radians

#### Parameters

##### b

`Point`

the other point

#### Returns

`number`

angle

***

### angleWithSep()

> **angleWithSep**(`x`, `y`): `number`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:171

Find the angle of the two vectors, solving the formula for
the cross product a x b = |a||b|sin(θ) for θ.

#### Parameters

##### x

`number`

the x-coordinate

##### y

`number`

the y-coordinate

#### Returns

`number`

the angle in radians

***

### clone()

> **clone**(): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:33

Clone this point, returning a new point that can be modified
without affecting the old one.

#### Returns

`Point`

the clone

***

### dist()

> **dist**(`p`): `number`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:137

Calculate the distance from this point to another point

#### Parameters

##### p

`Point`

the other point

#### Returns

`number`

distance

***

### distSqr()

> **distSqr**(`p`): `number`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:145

Calculate the distance from this point to another point,
without the square root step. Useful if you're comparing
relative distances.

#### Parameters

##### p

`Point`

the other point

#### Returns

`number`

distance

***

### div()

> **div**(`k`): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:75

Divide this point's x & y coordinates by a factor,
yielding a new point.

#### Parameters

##### k

`number`

factor

#### Returns

`Point`

output point

***

### divByPoint()

> **divByPoint**(`p`): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:61

Divide this point's x & y coordinates by point,
yielding a new point.

#### Parameters

##### p

`Point`

the other point

#### Returns

`Point`

output point

***

### equals()

> **equals**(`other`): `boolean`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:131

Judge whether this point is equal to another point, returning
true or false.

#### Parameters

##### other

`Point`

the other point

#### Returns

`boolean`

whether the points are equal

***

### mag()

> **mag**(): `number`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:124

Return the magnitude of this point: this is the Euclidean
distance from the 0, 0 coordinate to this point's x and y
coordinates.

#### Returns

`number`

magnitude

***

### matMult()

> **matMult**(`m`): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:96

Multiply this point by a 4x1 transformation matrix

#### Parameters

##### m

\[`number`, `number`, `number`, `number`\]

transformation matrix

#### Returns

`Point`

output point

***

### mult()

> **mult**(`k`): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:68

Multiply this point's x & y coordinates by a factor,
yielding a new point.

#### Parameters

##### k

`number`

factor

#### Returns

`Point`

output point

***

### multByPoint()

> **multByPoint**(`p`): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:54

Multiply this point's x & y coordinates by point,
yielding a new point.

#### Parameters

##### p

`Point`

the other point

#### Returns

`Point`

output point

***

### perp()

> **perp**(): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:111

Compute a perpendicular point, where the new y coordinate
is the old x coordinate and the new x coordinate is the old y
coordinate multiplied by -1

#### Returns

`Point`

perpendicular point

***

### rotate()

> **rotate**(`a`): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:82

Rotate this point around the 0, 0 origin by an angle a,
given in radians

#### Parameters

##### a

`number`

angle to rotate around, in radians

#### Returns

`Point`

output point

***

### rotateAround()

> **rotateAround**(`a`, `p`): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:90

Rotate this point around p point by an angle a,
given in radians

#### Parameters

##### a

`number`

angle to rotate around, in radians

##### p

`Point`

Point to rotate around

#### Returns

`Point`

output point

***

### round()

> **round**(): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:117

Return a version of this point with the x & y coordinates
rounded to integers.

#### Returns

`Point`

rounded point

***

### sub()

> **sub**(`p`): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:47

Subtract this point's x & y coordinates to from point,
yielding a new point.

#### Parameters

##### p

`Point`

the other point

#### Returns

`Point`

output point

***

### unit()

> **unit**(): `Point`

Defined in: node\_modules/.pnpm/@mapbox+point-geometry@1.1.0/node\_modules/@mapbox/point-geometry/index.d.ts:104

Calculate this point but as a unit vector from 0, 0, meaning
that the distance from the resulting point to the 0, 0
coordinate will be equal to 1 and the angle from the resulting
point to the 0, 0 coordinate will be the same as before.

#### Returns

`Point`

unit vector point
