import type { FeatureCollection } from '$routes/map/types/geojson';

export type TransformOptionMode = 'zone' | 'georef' | null;
export type ActiveTransformOptionMode = NonNullable<TransformOptionMode>;

export interface PendingZoneGeoRefData {
	featureCollection: FeatureCollection;
	entryName: string;
}
