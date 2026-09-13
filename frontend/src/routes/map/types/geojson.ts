/*
    https://geojson.io/
    https://geojson.org/
*/

import type {
	AnyGeometry,
	GeometryCollection,
	LineStringGeometry,
	MultiLineStringGeometry,
	MultiPointGeometry,
	MultiPolygonGeometry,
	PointGeometry,
	PolygonGeometry
} from './geometry';
import type { FeatureProp } from './properties';

export interface Feature<_Geometry = AnyGeometry, _Properties = FeatureProp> {
	type: 'Feature';
	id?: number | string;
	geometry: _Geometry;
	properties: _Properties;
}

export interface FeatureCollection<_Geometry = AnyGeometry, _Properties = FeatureProp> {
	type: 'FeatureCollection';
	features: Feature<_Geometry, _Properties>[];
}

export interface PointFeatureCollection<_Properties = FeatureProp> {
	type: 'FeatureCollection';
	features: Feature<PointGeometry | MultiPointGeometry, _Properties>[];
}

export interface LineStringFeatureCollection<_Properties = FeatureProp> {
	type: 'FeatureCollection';
	features: Feature<LineStringGeometry | MultiLineStringGeometry, _Properties>[];
}

export interface PolygonFeatureCollection<_Properties = FeatureProp> {
	type: 'FeatureCollection';
	features: Feature<PolygonGeometry | MultiPolygonGeometry, _Properties>[];
}

/** 標高を保持した面群。deck.glで屋根や垂直な壁面を描画する。 */
export type MultiPolygon3DFeatureCollection = FeatureCollection<{
	type: 'MultiPolygon';
	coordinates: [number, number, number][][][];
}>;

export interface GeometryCollectionFeatureCollection<_Properties = FeatureProp> {
	type: 'FeatureCollection';
	features: Feature<GeometryCollection, _Properties>[];
}
