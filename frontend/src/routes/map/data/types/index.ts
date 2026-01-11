import type { VectorEntry, GeoJsonMetaData, TileMetaData } from '$routes/map/data/types/vector';
import type {
	RasterEntry,
	RasterCategoricalStyle,
	RasterBaseMapStyle,
	RasterDemStyle,
	RasterTiffStyle,
	RasterCadStyle,
	TileXYZ
} from '$routes/map/data/types/raster';
import type { AnyModelEntry } from '$routes/map/data/types/model';
import type { AttributionKey } from '$routes/map/data/entries/meta_data/_attribution';
import type { Region } from './location';
import type { Tag } from './tags';

export type GeoDataType = 'raster' | 'vector' | 'model';
export type Opacity = 1 | 0.7 | 0.5 | 0.3;

export interface BaseMetaData {
	name: string;
	sourceDataName?: string;
	description?: string;
	downloadUrl?: string;
	attribution: AttributionKey;
	tags: Tag[];
	location: Region;
	maxZoom: number;
	minZoom: number;
	bounds: [number, number, number, number];
	coverImage?: string;
	mapImage?: string;
	xyzImageTile: TileXYZ;
	center?: [number, number];
}

export type AnyRasterEntry = RasterEntry<
	RasterCategoricalStyle | RasterBaseMapStyle | RasterDemStyle | RasterTiffStyle | RasterCadStyle
>;

export type AnyVectorEntry = VectorEntry<GeoJsonMetaData | TileMetaData>;

export type GeoDataEntry = AnyRasterEntry | AnyVectorEntry | AnyModelEntry;
