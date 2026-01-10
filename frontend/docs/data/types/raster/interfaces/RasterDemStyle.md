[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/raster](../README.md) / RasterDemStyle

# Interface: RasterDemStyle

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:183](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/data/types/raster/index.ts#L183)

## Properties

### opacity

> **opacity**: [`Opacity`](../../type-aliases/Opacity.md)

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:185](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/data/types/raster/index.ts#L185)

***

### type

> **type**: `"dem"`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:184](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/data/types/raster/index.ts#L184)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:186](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/data/types/raster/index.ts#L186)

***

### visualization

> **visualization**: `object`

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:187](https://github.com/forestacdev/morivis/blob/7130c0fc1485e879ee8f8cd5e93ba1810b50e1b0/frontend/src/routes/map/data/types/raster/index.ts#L187)

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
