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

// Vector factories
export {
	createPointEntry,
	createLineEntry,
	createPolygonEntry,
	type PointEntryConfig,
	type LineEntryConfig,
	type PolygonEntryConfig
} from './vector';

// Model factories
export {
	createMeshModelEntry,
	createPointCloudEntry,
	type MeshModelEntryConfig,
	type PointCloudEntryConfig
} from './model';
