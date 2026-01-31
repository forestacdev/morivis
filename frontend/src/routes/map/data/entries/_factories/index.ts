// Raster factories
export {
	createBasemapEntry,
	createDemEntry,
	createCategoricalRasterEntry,
	createCadRasterEntry,
	type BasemapEntryConfig,
	type DemEntryConfig,
	type CategoricalRasterEntryConfig,
	type CadRasterEntryConfig
} from './raster';

// Vector factories (for TileMetaData - MVT/PMTiles)
export {
	createPointEntry,
	createLineEntry,
	createPolygonEntry,
	type PointEntryConfig,
	type LineEntryConfig,
	type PolygonEntryConfig
} from './vector';

// GeoJSON factories (for GeoJsonMetaData - GeoJSON/FGB)
export {
	createGeoJsonPointEntry,
	createGeoJsonLineEntry,
	createGeoJsonPolygonEntry,
	type GeoJsonPointEntryConfig,
	type GeoJsonLineEntryConfig,
	type GeoJsonPolygonEntryConfig
} from './geojson';

// Model factories
export {
	createMeshModelEntry,
	createPointCloudEntry,
	type MeshModelEntryConfig,
	type PointCloudEntryConfig
} from './model';
