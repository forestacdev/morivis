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

export type Geometry =
    | PointGeometry
    | LineStringGeometry
    | PolygonGeometry
    | MultiPointGeometry
    | MultiLineStringGeometry
    | MultiPolygonGeometry;
