import type { VectorEntry, GeoJsonMetaData, TileMetaData } from '$map/data/types/vector';

import type {
	RasterEntry,
	RasterCategoricalStyle,
	RasterBaseMapStyle
} from '$map/data/types/raster';

export type GeoDataType = 'raster' | 'vector' | '3d';

export type GeoDataEntry =
	| VectorEntry<GeoJsonMetaData | TileMetaData>
	| RasterEntry<RasterCategoricalStyle | RasterBaseMapStyle>;
