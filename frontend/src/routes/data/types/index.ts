import type { VectorEntry, GeoJsonMetaData, TileMetaData } from '$routes/data/types/vector';

import type {
	RasterEntry,
	RasterCategoricalStyle,
	RasterBaseMapStyle
} from '$routes/data/types/raster';

export type GeoDataType = 'raster' | 'vector' | '3d';

export type GeoDataEntry =
	| VectorEntry<GeoJsonMetaData | TileMetaData>
	| RasterEntry<RasterCategoricalStyle | RasterBaseMapStyle>;
