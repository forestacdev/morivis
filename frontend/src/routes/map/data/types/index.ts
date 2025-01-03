import type { VectorEntry, GeoJsonMetaData, TileMetaData } from '$map/data/types/vector';

export type GeoDataType = 'raster' | 'vector' | '3d';

export type GeoDataEntry = VectorEntry<GeoJsonMetaData> | VectorEntry<TileMetaData>;
