[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/raster](../README.md) / RasterDemStyle

# Interface: RasterDemStyle

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:182](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/raster/index.ts#L182)

## Extends

- [`BaseRasterStyle`](BaseRasterStyle.md)

## Properties

### maxZoom?

> `optional` **maxZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:80](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/raster/index.ts#L80)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`maxZoom`](BaseRasterStyle.md#maxzoom)

***

### minZoom?

> `optional` **minZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:79](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/raster/index.ts#L79)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`minZoom`](BaseRasterStyle.md#minzoom)

***

### opacity

> **opacity**: [`Opacity`](../../type-aliases/Opacity.md)

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:77](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/raster/index.ts#L77)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`opacity`](BaseRasterStyle.md#opacity)

***

### type

> **type**: `"dem"`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:183](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/raster/index.ts#L183)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:78](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/raster/index.ts#L78)

#### Inherited from

[`BaseRasterStyle`](BaseRasterStyle.md).[`visible`](BaseRasterStyle.md#visible)

***

### visualization

> **visualization**: `object`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:184](https://github.com/forestacdev/morivis/blob/c4874b62871f939aa8111012adfc001e4ac1dae6/frontend/src/routes/map/data/types/raster/index.ts#L184)

#### demType

> **demType**: `"mapbox"` \| `"gsi"` \| `"terrarium"`

#### mode

> **mode**: `"default"` \| `"relief"` \| `"slope"` \| `"aspect"` \| `"curvature"` \| `"shadow"`

#### uniformsData

> **uniformsData**: `object`

##### uniformsData.aspect?

> `optional` **aspect**: `object`

##### uniformsData.aspect.colorMap

> **colorMap**: `"cool"` \| `"warm"` \| `"jet"` \| `"hsv"` \| `"hot"` \| `"spring"` \| `"summer"` \| `"autumn"` \| `"winter"` \| `"bone"` \| `"copper"` \| `"greys"` \| `"yignbu"` \| `"greens"` \| `"yiorrd"` \| `"bluered"` \| `"rdbu"` \| `"picnic"` \| `"rainbow"` \| `"portland"` \| `"blackbody"` \| `"earth"` \| `"electric"` \| `"viridis"` \| `"inferno"` \| `"magma"` \| `"plasma"` \| `"rainbow-soft"` \| `"bathymetry"` \| `"cdom"` \| `"chlorophyll"` \| `"density"` \| `"freesurface-blue"` \| `"freesurface-red"` \| `"oxygen"` \| `"par"` \| `"phase"` \| `"salinity"` \| `"temperature"` \| `"turbidity"` \| `"velocity-blue"` \| `"velocity-green"` \| `"cubehelix"`

##### uniformsData.curvature?

> `optional` **curvature**: `object`

##### uniformsData.curvature.colorMap

> **colorMap**: `"cool"` \| `"warm"` \| `"jet"` \| `"hsv"` \| `"hot"` \| `"spring"` \| `"summer"` \| `"autumn"` \| `"winter"` \| `"bone"` \| `"copper"` \| `"greys"` \| `"yignbu"` \| `"greens"` \| `"yiorrd"` \| `"bluered"` \| `"rdbu"` \| `"picnic"` \| `"rainbow"` \| `"portland"` \| `"blackbody"` \| `"earth"` \| `"electric"` \| `"viridis"` \| `"inferno"` \| `"magma"` \| `"plasma"` \| `"rainbow-soft"` \| `"bathymetry"` \| `"cdom"` \| `"chlorophyll"` \| `"density"` \| `"freesurface-blue"` \| `"freesurface-red"` \| `"oxygen"` \| `"par"` \| `"phase"` \| `"salinity"` \| `"temperature"` \| `"turbidity"` \| `"velocity-blue"` \| `"velocity-green"` \| `"cubehelix"`

##### uniformsData.relief

> **relief**: `object`

##### uniformsData.relief.colorMap

> **colorMap**: `"cool"` \| `"warm"` \| `"jet"` \| `"hsv"` \| `"hot"` \| `"spring"` \| `"summer"` \| `"autumn"` \| `"winter"` \| `"bone"` \| `"copper"` \| `"greys"` \| `"yignbu"` \| `"greens"` \| `"yiorrd"` \| `"bluered"` \| `"rdbu"` \| `"picnic"` \| `"rainbow"` \| `"portland"` \| `"blackbody"` \| `"earth"` \| `"electric"` \| `"viridis"` \| `"inferno"` \| `"magma"` \| `"plasma"` \| `"rainbow-soft"` \| `"bathymetry"` \| `"cdom"` \| `"chlorophyll"` \| `"density"` \| `"freesurface-blue"` \| `"freesurface-red"` \| `"oxygen"` \| `"par"` \| `"phase"` \| `"salinity"` \| `"temperature"` \| `"turbidity"` \| `"velocity-blue"` \| `"velocity-green"` \| `"cubehelix"`

##### uniformsData.relief.max

> **max**: `number`

##### uniformsData.relief.min

> **min**: `number`

##### uniformsData.slope?

> `optional` **slope**: `object`

##### uniformsData.slope.colorMap

> **colorMap**: `"cool"` \| `"warm"` \| `"jet"` \| `"hsv"` \| `"hot"` \| `"spring"` \| `"summer"` \| `"autumn"` \| `"winter"` \| `"bone"` \| `"copper"` \| `"greys"` \| `"yignbu"` \| `"greens"` \| `"yiorrd"` \| `"bluered"` \| `"rdbu"` \| `"picnic"` \| `"rainbow"` \| `"portland"` \| `"blackbody"` \| `"earth"` \| `"electric"` \| `"viridis"` \| `"inferno"` \| `"magma"` \| `"plasma"` \| `"rainbow-soft"` \| `"bathymetry"` \| `"cdom"` \| `"chlorophyll"` \| `"density"` \| `"freesurface-blue"` \| `"freesurface-red"` \| `"oxygen"` \| `"par"` \| `"phase"` \| `"salinity"` \| `"temperature"` \| `"turbidity"` \| `"velocity-blue"` \| `"velocity-green"` \| `"cubehelix"`

##### uniformsData.slope.max

> **max**: `number`

##### uniformsData.slope.min

> **min**: `number`
