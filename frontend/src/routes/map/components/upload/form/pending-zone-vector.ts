import type { VectorStyle } from '$routes/map/data/types/vector/style';
import type { FeatureCollection } from '$routes/map/types/geojson';

export type TransformOptionMode = 'zone' | 'georef' | null;
export type ActiveTransformOptionMode = NonNullable<TransformOptionMode>;

export interface PendingZoneGeoRefData {
	featureCollection: FeatureCollection;
	entryName: string;
	vectorStyle?: VectorStyle;
	attribution?: string;
}
