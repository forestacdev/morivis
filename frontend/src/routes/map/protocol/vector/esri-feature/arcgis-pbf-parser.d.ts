declare module 'arcgis-pbf-parser' {
	interface ArcGisPbfResult {
		featureCollection: GeoJSON.FeatureCollection;
		exceededTransferLimit: boolean;
	}
	const arcgisPbfDecode: (data: Uint8Array) => ArcGisPbfResult;
	export default arcgisPbfDecode;
}
