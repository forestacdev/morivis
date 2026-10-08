import type { FeatureCollection } from '$routes/map/types/geojson';

export type TyphoonKind = 'centers' | 'tracks' | 'circles';
export type TyphoonData = Record<TyphoonKind, FeatureCollection>;
export const emptyTyphoonData = (): TyphoonData => ({
	centers: { type: 'FeatureCollection', features: [] },
	tracks: { type: 'FeatureCollection', features: [] },
	circles: { type: 'FeatureCollection', features: [] }
});
