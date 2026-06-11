// Raster factories
export {
	type BasemapEntryConfig,
	type CadRasterEntryConfig,
	type CategoricalRasterEntryConfig,
	createBasemapEntry,
	createCadRasterEntry,
	createCategoricalRasterEntry,
	createDemEntry,
	type DemEntryConfig
} from './raster';

// Tile factories (for TileMetaData - MVT/PMTiles)
export {
	createTileLineEntry,
	createTilePointEntry,
	createTilePolygonEntry,
	type TileLineEntryConfig,
	type TilePointEntryConfig,
	type TilePolygonEntryConfig
} from './vector';

// GeoJSON factories (for GeoJsonMetaData - GeoJSON/FGB)
export {
	createGeoJsonLineEntry,
	createGeoJsonPointEntry,
	createGeoJsonPolygonEntry,
	type GeoJsonLineEntryConfig,
	type GeoJsonPointEntryConfig,
	type GeoJsonPolygonEntryConfig
} from './geojson';

// Model factories
export {
	createMeshModelEntry,
	createPointCloudEntry,
	type MeshModelEntryConfig,
	type PointCloudEntryConfig
} from './model';
