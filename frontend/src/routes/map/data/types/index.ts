import type { VectorEntry, GeoJsonMetaData, TileMetaData } from '$map/data/types/vector';

import type { RasterEntry } from '$map/data/types/raster';

export type GeoDataType = 'raster' | 'vector' | '3d';

export type GeoDataEntry = VectorEntry<GeoJsonMetaData> | VectorEntry<TileMetaData> | RasterEntry;
