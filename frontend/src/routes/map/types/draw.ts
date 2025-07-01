
export interface DrawProp { 
    id: string
    color: string;
    opacity: number;
}
export interface DrawGeojsonFeature {
    type: 'Feature';
    id: string;
    properties: DrawProp;
    geometry: {
        type: 'Point' | 'LineString' | 'Polygon';
        coordinates: number[][] |[number, number] | [number, number][];
    };
}

export interface DrawGeojsonData {
    type: 'FeatureCollection';
    features: DrawGeojsonFeature[];
}

