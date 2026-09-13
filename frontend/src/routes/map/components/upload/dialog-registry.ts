import type { Component } from 'svelte';

import type { DialogType } from '$routes/map/types';

export type DialogProfile =
	| 'simple'
	| 'drop-file'
	| 'side-panel'
	| 'model-georef'
	| 'vector-zone'
	| 'vector-zone-georef'
	| 'raster-georef'
	| 'pointcloud-georef'
	| 'feature-service'
	| 'remote-wmts'
	| 'remote-geozarr'
	| 'tiles'
	| 'wcs'
	| 'tile-url-type'
	| 'vector-georef';

export interface DialogDefinition {
	load: () => Promise<{ default: Component<any>; }>;
	profile: DialogProfile;
	fixedHeight?: boolean;
}

const tileDialog: DialogDefinition = {
	load: () => import('$routes/map/components/upload/form/TileForm.svelte'),
	profile: 'tiles'
};

export const dialogRegistry: Partial<Record<Exclude<DialogType, null>, DialogDefinition>> = {
	wmts: {
		load: () => import('$routes/map/components/upload/form/WmtsForm.svelte'),
		profile: 'remote-wmts'
	},
	wcs: {
		load: () => import('$routes/map/components/upload/form/WcsForm.svelte'),
		profile: 'wcs'
	},
	geozarr: {
		load: () => import('$routes/map/components/upload/form/GeoZarrForm.svelte'),
		profile: 'remote-geozarr'
	},
	featureservice: {
		load: () => import('$routes/map/components/upload/form/FeatureServiceForm.svelte'),
		profile: 'feature-service'
	},
	wfs: {
		load: () => import('$routes/map/components/upload/form/FeatureServiceForm.svelte'),
		profile: 'feature-service'
	},
	ogcapifeatures: {
		load: () => import('$routes/map/components/upload/form/FeatureServiceForm.svelte'),
		profile: 'feature-service'
	},
	stac: {
		load: () => import('$routes/map/components/upload/form/StacForm.svelte'),
		profile: 'simple'
	},
	arcgis: {
		load: () => import('$routes/map/components/upload/form/ArcGisForm.svelte'),
		profile: 'simple'
	},
	csv: {
		load: () => import('$routes/map/components/upload/form/CsvForm.svelte'),
		profile: 'vector-zone-georef'
	},
	tsv: {
		load: () => import('$routes/map/components/upload/form/TsvForm.svelte'),
		profile: 'vector-zone-georef'
	},
	xlsx: {
		load: () => import('$routes/map/components/upload/form/XlsxForm.svelte'),
		profile: 'vector-zone-georef'
	},
	raster: tileDialog,
	tileurltype: {
		load: () => import('$routes/map/components/upload/form/TileUrlTypeForm.svelte'),
		profile: 'tile-url-type'
	},
	'3dtiles': tileDialog,
	'local-3dtiles': tileDialog,
	'local-mvt': tileDialog,
	'local-mlt': tileDialog,
	'local-raster-tiles': tileDialog,
	pointcloud: {
		load: () => import('$routes/map/components/upload/form/PointCloudForm.svelte'),
		profile: 'pointcloud-georef'
	},
	mbtiles: tileDialog,
	netcdf: {
		load: () => import('$routes/map/components/upload/form/NetCDFForm.svelte'),
		profile: 'raster-georef'
	},
	grib2: {
		load: () => import('$routes/map/components/upload/form/Grib2Form.svelte'),
		profile: 'drop-file'
	},
	hrit: {
		load: () => import('$routes/map/components/upload/form/HritForm.svelte'),
		profile: 'drop-file'
	},
	demxml: {
		load: () => import('$routes/map/components/upload/form/DemXmlForm.svelte'),
		profile: 'raster-georef'
	},
	pmtiles: tileDialog,
	model: {
		load: () => import('$routes/map/components/upload/form/MeshModelForm.svelte'),
		profile: 'model-georef'
	},
	'gaussian-splat': {
		load: () => import('$routes/map/components/upload/form/GaussianSplatForm.svelte'),
		profile: 'model-georef'
	},
	geophoto: {
		load: () => import('$routes/map/components/upload/form/GeoPhotoForm.svelte'),
		profile: 'drop-file'
	},
	geopdf: {
		load: () => import('$routes/map/components/upload/form/GeoPdfForm.svelte'),
		profile: 'raster-georef'
	},
	geotiff: {
		load: () => import('$routes/map/components/upload/form/GeoTiffForm.svelte'),
		profile: 'pointcloud-georef'
	},
	svg: {
		load: () => import('$routes/map/components/upload/form/SvgForm.svelte'),
		profile: 'vector-georef'
	},
	vector: tileDialog,
	geojson: {
		load: () => import('$routes/map/components/upload/form/GeoJsonForm.svelte'),
		profile: 'vector-zone-georef'
	},
	wkt: {
		load: () => import('$routes/map/components/upload/form/WktForm.svelte'),
		profile: 'vector-zone-georef'
	},
	geoparquet: {
		load: () => import('$routes/map/components/upload/form/GeoParquetForm.svelte'),
		profile: 'vector-zone-georef'
	},
	geoarrow: {
		load: () => import('$routes/map/components/upload/form/GeoArrowForm.svelte'),
		profile: 'vector-zone'
	},
	mif: {
		load: () => import('$routes/map/components/upload/form/MifForm.svelte'),
		profile: 'vector-zone-georef'
	},
	mfjson: {
		load: () => import('$routes/map/components/upload/form/MfJsonForm.svelte'),
		profile: 'drop-file'
	},
	locationhistory: {
		load: () => import('$routes/map/components/upload/form/LocationHistoryForm.svelte'),
		profile: 'drop-file'
	},
	topojson: {
		load: () => import('$routes/map/components/upload/form/TopoJsonForm.svelte'),
		profile: 'vector-zone-georef'
	},
	gml: {
		load: () => import('$routes/map/components/upload/form/GmlForm.svelte'),
		profile: 'vector-zone-georef'
	},
	citygml: {
		load: () => import('$routes/map/components/upload/form/CityGmlForm.svelte'),
		profile: 'drop-file'
	},
	kml: {
		load: () => import('$routes/map/components/upload/form/KmlForm.svelte'),
		profile: 'vector-zone-georef'
	},
	landxml: {
		load: () => import('$routes/map/components/upload/form/LandXmlForm.svelte'),
		profile: 'pointcloud-georef'
	},
	gpx: {
		load: () => import('$routes/map/components/upload/form/GpxForm.svelte'),
		profile: 'drop-file'
	},
	tcx: {
		load: () => import('$routes/map/components/upload/form/TcxForm.svelte'),
		profile: 'drop-file'
	},
	filegdb: {
		load: () => import('$routes/map/components/upload/form/FileGdbForm.svelte'),
		profile: 'drop-file'
	},
	gdb: {
		load: () => import('$routes/map/components/upload/form/GarminGDBForm.svelte'),
		profile: 'drop-file'
	},
	osm: {
		load: () => import('$routes/map/components/upload/form/OsmForm.svelte'),
		profile: 'vector-zone-georef'
	},
	georss: {
		load: () => import('$routes/map/components/upload/form/GeoRssForm.svelte'),
		profile: 'vector-zone-georef'
	},
	gtfs: {
		load: () => import('$routes/map/components/upload/form/GtfsForm.svelte'),
		profile: 'drop-file'
	},
	drm: {
		load: () => import('$routes/map/components/upload/form/DrmForm.svelte'),
		profile: 'drop-file'
	},
	dm: {
		load: () => import('$routes/map/components/upload/form/DmForm.svelte'),
		profile: 'vector-zone-georef',
		fixedHeight: true
	},
	dwg: {
		load: () => import('$routes/map/components/upload/form/DwgForm.svelte'),
		profile: 'vector-zone-georef',
		fixedHeight: true
	},
	dxf: {
		load: () => import('$routes/map/components/upload/form/DxfForm.svelte'),
		profile: 'vector-zone-georef',
		fixedHeight: true
	},
	jww: {
		load: () => import('$routes/map/components/upload/form/JwwForm.svelte'),
		profile: 'vector-zone-georef',
		fixedHeight: true
	},
	cedxm: {
		load: () => import('$routes/map/components/upload/form/CedxmForm.svelte'),
		profile: 'vector-zone-georef',
		fixedHeight: true
	},
	sxf: {
		load: () => import('$routes/map/components/upload/form/SxfForm.svelte'),
		profile: 'vector-zone-georef',
		fixedHeight: true
	},
	gpkg: {
		load: () => import('$routes/map/components/upload/form/GpkgForm.svelte'),
		profile: 'vector-zone-georef'
	},
	sqlite: {
		load: () => import('$routes/map/components/upload/form/SQLiteForm.svelte'),
		profile: 'vector-zone-georef'
	},
	hdf5: {
		load: () => import('$routes/map/components/upload/form/Hdf5Form.svelte'),
		profile: 'drop-file'
	},
	mojxml: {
		load: () => import('$routes/map/components/upload/form/MojXmlForm.svelte'),
		profile: 'vector-zone-georef'
	},
	sima: {
		load: () => import('$routes/map/components/upload/form/SimaForm.svelte'),
		profile: 'vector-zone-georef'
	},
	bcf: {
		load: () => import('$routes/map/components/upload/form/BcfForm.svelte'),
		profile: 'side-panel'
	}
};
