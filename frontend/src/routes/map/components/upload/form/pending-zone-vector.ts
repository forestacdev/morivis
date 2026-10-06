import type { VectorEntryGroup } from '$routes/map/components/upload/form/vector-entry-group';
import type { VectorStyle } from '$routes/map/data/types/vector/style';
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { EpsgCode } from '$routes/map/utils/proj/dict';

export type TransformOptionMode = 'zone' | 'georef' | null;
export type ActiveTransformOptionMode = NonNullable<TransformOptionMode>;

export interface PendingZoneGeoRefData {
	featureCollection: FeatureCollection;
	entryName: string;
	/** 入力ファイルから取得した座標系の候補。最終確定はZone画面で行う。 */
	suggestedEpsgCode?: EpsgCode;
	vectorStyle?: VectorStyle;
	vectorGroups?: VectorEntryGroup[];
	attribution?: string;
}
