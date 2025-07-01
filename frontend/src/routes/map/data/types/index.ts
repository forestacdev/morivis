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
	bounds?: [number, number, number, number];
	coverImage?: string;
}

export type GeoDataEntry =
	| VectorEntry<GeoJsonMetaData | TileMetaData>
	| RasterEntry<RasterCategoricalStyle | RasterBaseMapStyle | RasterDemStyle | RasterTiffStyle>;
