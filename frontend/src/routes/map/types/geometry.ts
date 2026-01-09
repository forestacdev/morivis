export type PointGeometry = {
	type: 'Point';
	coordinates: [number, number];
};

export type LineStringGeometry = {
	type: 'LineString';
	coordinates: [number, number][];
};

export type PolygonGeometry = {
	type: 'Polygon';
	coordinates: [number, number][][];
};

export type MultiPointGeometry = {
	type: 'MultiPoint';
	coordinates: [number, number][];
};

export type MultiLineStringGeometry = {
	type: 'MultiLineString';
	coordinates: [number, number][][];
};

export type MultiPolygonGeometry = {
	type: 'MultiPolygon';
	coordinates: [number, number][][][];
};

export type SingleGeometry = PointGeometry | LineStringGeometry;

export type MultiGeometry = MultiPointGeometry | MultiLineStringGeometry | MultiPolygonGeometry;

export type AnyGeometry = SingleGeometry | MultiGeometry;

export type GeometrySingleCollection = {
	type: 'GeometryCollection';
	geometries: SingleGeometry[];
};

export type GeometryMultiCollection = {
	type: 'GeometryCollection';
	geometries: MultiGeometry[];
};

export type GeometryCollection = GeometrySingleCollection | GeometryMultiCollection;
