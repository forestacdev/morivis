declare module '@mapbox/togeojson' {
	import type { FeatureCollection } from '$routes/map/types/geojson';

	const toGeoJSON: {
		kml: (doc: Document) => FeatureCollection;
		gpx: (doc: Document) => FeatureCollection;
	};

	export default toGeoJSON;
}
