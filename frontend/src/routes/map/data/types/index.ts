import type { AttributionKey } from '$routes/map/data/entries/_meta_data/_attribution';
import type { MorivisModelEntry } from '$routes/map/data/types/model';
import type {
	MorivisRasterEntry,
	RasterBaseMapStyle,
	RasterCadStyle,
	RasterCategoricalStyle,
	RasterDemStyle,
	RasterTiffStyle,
	TileXYZ
} from '$routes/map/data/types/raster';
import type { StyleJsonEntry } from '$routes/map/data/types/stylejson';
import type {
	GeoJsonMetaData,
	MorivisVectorEntry,
	TileMetaData
} from '$routes/map/data/types/vector';
import type { LayerSpecification, SourceSpecification } from 'maplibre-gl';
import type { Region } from './location';
import type { Tag } from './tags';

export type MorivisLayerType = 'raster' | 'vector' | 'model' | 'stylejson';
export type Opacity = 1 | 0.7 | 0.5 | 0.3;
export type RangeTuple = [min: number, max: number];

export interface SharedDiscreteDimension {
	type: 'time' | 'variant';
	values: string[];
	labels?: string[];
	placeholder?: string;
}

export interface SharedDimensionState {
	currentIndex: number;
}

export interface SourceTemporalBehavior {
	type: 'source';
}

export interface FilterTemporalBehavior {
	type: 'filter';
	key?: string;
	alternateKeys?: string[];
	startKey?: string;
	endKey?: string;
}

export type TemporalBehavior = SourceTemporalBehavior | FilterTemporalBehavior;

export interface AdjustableRange {
	value: RangeTuple;
	domain: RangeTuple;
}

export const createAdjustableRange = (
	min: number,
	max: number,
	domainMin = min,
	domainMax = max
): AdjustableRange => ({
	value: [min, max],
	domain: [domainMin, domainMax]
});

export const getAdjustableRangeValue = (
	range: AdjustableRange | undefined,
	legacyMin: number | undefined,
	legacyMax: number | undefined,
	fallbackMin = 0,
	fallbackMax = 0
): RangeTuple => {
	if (range) return range.value;
	return [legacyMin ?? fallbackMin, legacyMax ?? fallbackMax];
};

export const getAdjustableRangeDomain = (
	range: AdjustableRange | undefined,
	legacyMin: number | undefined,
	legacyMax: number | undefined,
	fallbackMin = 0,
	fallbackMax = 0
): RangeTuple => {
	if (range) return range.domain;
	return [legacyMin ?? fallbackMin, legacyMax ?? fallbackMax];
};

export type AuxiliaryLayerSpecification = LayerSpecification & {
	clickable?: boolean;
};

export interface AuxiliaryLayersData {
	// MapLibreのソース定義をそのまま使用
	sources?: {
		[key: string]: SourceSpecification; // MapLibre SourceSpecification
	};
	// MapLibreのレイヤー定義をそのまま使用
	layers: AuxiliaryLayerSpecification[];
}

export interface BaseMetaData {
	name: string;
	sourceDataName?: string;
	/** 「何のデータか」→「どう使うものか」の順で事実ベースで書く。主観的評価や他データとの比較は書かない */
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
	/** ユーザーがアップロードしたデータかどうか */
	isUserUploaded?: boolean;
	/** lazy entry の fallback など、まだ追加の解決処理が必要な状態かどうか */
	needsLazyHydration?: boolean;
}

export type AnyRasterEntry = MorivisRasterEntry<
	RasterCategoricalStyle | RasterBaseMapStyle | RasterDemStyle | RasterTiffStyle | RasterCadStyle
>;

export type AnyVectorEntry = MorivisVectorEntry<GeoJsonMetaData | TileMetaData>;

export type MorivisLayerEntry =
	| AnyRasterEntry
	| AnyVectorEntry
	| MorivisModelEntry
	| StyleJsonEntry;

export interface MorivisLayerEntryCatalogItem {
	entry: MorivisLayerEntry;
	loadEntry?: () => Promise<MorivisLayerEntry>;
}
