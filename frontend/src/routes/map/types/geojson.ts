/*
    https://geojson.io/
    https://geojson.org/
*/

import type { FeatureProp } from './properties';
import type {
	AnyGeometry,
	PointGeometry,
	LineStringGeometry,
	PolygonGeometry,
	MultiPointGeometry,
	MultiLineStringGeometry,
	MultiPolygonGeometry,
	GeometryCollection
} from './geometry';

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

export interface GeometryCollectionFeatureCollection<_Properties = FeatureProp> {
	type: 'FeatureCollection';
	features: Feature<GeometryCollection, _Properties>[];
}
