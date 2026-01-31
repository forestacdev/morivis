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

// Tile factories (for TileMetaData - MVT/PMTiles)
export {
	createTilePointEntry,
	createTileLineEntry,
	createTilePolygonEntry,
	type TilePointEntryConfig,
	type TileLineEntryConfig,
	type TilePolygonEntryConfig
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
