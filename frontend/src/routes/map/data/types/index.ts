import type { VectorEntry, GeoJsonMetaData, TileMetaData } from '$routes/map/data/types/vector';

import type {
	RasterEntry,
	RasterCategoricalStyle,
	RasterBaseMapStyle,
	RasterDemStyle,
	RasterTiffStyle
} from '$routes/map/data/types/raster';
import type { AttributionKey } from '../attribution';
import type { Region } from './location';

export type GeoDataType = 'raster' | 'vector' | '3d';

export interface BaseMetaData {
	name: string;
	description: string;
	downloadUrl?: string;
	attribution: AttributionKey;
	location: Region;
	maxZoom: number;
	minZoom: number;
	bounds: [number, number, number, number];
	coverImage?: string;
	center?: [number, number];
}

export type AnyRasterEntry = RasterEntry<
	RasterCategoricalStyle | RasterBaseMapStyle | RasterDemStyle | RasterTiffStyle
>;

export type AnyVectorEntry = VectorEntry<GeoJsonMetaData | TileMetaData>;

export type GeoDataEntry = AnyRasterEntry | AnyVectorEntry;
