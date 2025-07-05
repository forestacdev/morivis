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

export type Tag =
	| '森林'
	| '森林歩道'
	| '林道'
	| '地図'
	| '地形'
	| '地質図'
	| '河川'
	| '道路'
	| '建物'
	| '国有林'
	| '街路樹'
	| '土壌図'
	| '地形'
	| '微地形図'
	| '傾斜区分図'
	| '傾斜量図'
	| '基本図'
	| '植生図'
	| '林班図'
	| '林相図'
	| '単木'
	| '看板'
	| '写真'
	| 'フェノロジー'
	| 'DEM'
	| 'TWI'
	| 'メッシュ';

export interface BaseMetaData {
	name: string;
	description: string;
	downloadUrl?: string;
	attribution: AttributionKey;
	tags: Tag[];
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
