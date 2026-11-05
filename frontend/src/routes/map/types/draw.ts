import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type { GeoJSONStoreFeatures } from 'terra-draw';

export type DrawMode =
	| 'point'
	| 'linestring'
	| 'polygon'
	| 'circle'
	| 'sector'
	| 'rectangle'
	| 'freehand'
	| 'select';

export type DrawGeojsonFeature =
	& Feature<
		Point | LineString | Polygon,
		GeoJSONStoreFeatures['properties'] & {
			id: string | number;
			color: string;
			opacity: number;
			mode: Exclude<DrawMode, 'select'>;
		}
	>
	& { id: string | number; };

export type DrawGeojsonData =
	& Omit<
		FeatureCollection<DrawGeojsonFeature['geometry'], DrawGeojsonFeature['properties']>,
		'features'
	>
	& {
		features: DrawGeojsonFeature[];
	};
