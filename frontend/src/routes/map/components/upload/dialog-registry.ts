import type { DialogType } from '$routes/map/types';
import type { Component } from 'svelte';
import type { DialogProfile, DialogPropsByProfile } from './dialog-props';

export type { DialogProfile } from './dialog-props';

type LoadedDialog<P extends DialogProfile> = {
	profile: P;
	component: Component<DialogPropsByProfile[P]>;
};

export type DialogDefinition = {
	[P in DialogProfile]: {
		profile: P;
		load: () => Promise<{ default: LoadedDialog<P>; }>;
		fixedHeight?: boolean;
	};
}[DialogProfile];

export type LoadedUploadDialog = {
	[P in DialogProfile]: LoadedDialog<P>;
}[DialogProfile];

export type DialogLoader = () => Promise<{ default: LoadedUploadDialog; }>;

/** profileとフォームのpropsを照合し、その組を遅延ロード後も保持する。 */
export const defineDialog = <P extends DialogProfile>(definition: {
	profile: P;
	load: () => Promise<{ default: Component<DialogPropsByProfile[NoInfer<P>]>; }>;
	fixedHeight?: boolean;
}) => ({
	profile: definition.profile,
	fixedHeight: definition.fixedHeight,
	load: async (): Promise<{ default: LoadedDialog<P>; }> => ({
		default: { profile: definition.profile, component: (await definition.load()).default }
	})
});

const tileDialog = defineDialog({
	load: () => import('$routes/map/components/upload/form/TileForm.svelte'),
	profile: 'tiles'
});

export const dialogRegistry: Partial<Record<Exclude<DialogType, null>, DialogDefinition>> = {
	jpeg2000: defineDialog({
		load: () => import('$routes/map/components/upload/form/Jpeg2000Form.svelte'),
		profile: 'pointcloud-georef'
	}),
	video: defineDialog({
		load: () => import('$routes/map/components/upload/form/VideoForm.svelte'),
		profile: 'raster-georef'
	}),
	'envi-bil': defineDialog({
		load: () => import('$routes/map/components/upload/form/EnviBilForm.svelte'),
		profile: 'pointcloud-georef'
	}),
	hgt: defineDialog({
		load: () => import('$routes/map/components/upload/form/HgtForm.svelte'),
		profile: 'raster-georef'
	}),
	'ascii-grid': defineDialog({
		load: () => import('$routes/map/components/upload/form/AsciiGridForm.svelte'),
		profile: 'pointcloud-georef'
	}),
	bds: defineDialog({
		load: () => import('$routes/map/components/upload/form/BdsForm.svelte'),
		profile: 'drop-file'
	}),
	gcd: defineDialog({
		load: () => import('$routes/map/components/upload/form/GcdForm.svelte'),
		profile: 'drop-file'
	}),
	wmts: defineDialog({
		load: () => import('$routes/map/components/upload/form/WmtsForm.svelte'),
		profile: 'remote-wmts'
	}),
	wcs: defineDialog({
		load: () => import('$routes/map/components/upload/form/WcsForm.svelte'),
		profile: 'wcs'
	}),
	geozarr: defineDialog({
		load: () => import('$routes/map/components/upload/form/GeoZarrForm.svelte'),
		profile: 'remote-geozarr'
	}),
	featureservice: defineDialog({
		load: () => import('$routes/map/components/upload/form/FeatureServiceForm.svelte'),
		profile: 'feature-service'
	}),
	wfs: defineDialog({
		load: () => import('$routes/map/components/upload/form/FeatureServiceForm.svelte'),
		profile: 'feature-service'
	}),
	ogcapifeatures: defineDialog({
		load: () => import('$routes/map/components/upload/form/FeatureServiceForm.svelte'),
		profile: 'feature-service'
	}),
	csw: defineDialog({
		load: () => import('$routes/map/components/upload/form/CswForm.svelte'),
		profile: 'remote-csw',
		fixedHeight: true
	}),
	stac: defineDialog({
		load: () => import('$routes/map/components/upload/form/StacForm.svelte'),
		profile: 'remote-stac'
	}),
	arcgis: defineDialog({
		load: () => import('$routes/map/components/upload/form/ArcGisForm.svelte'),
		profile: 'remote-arcgis'
	}),
	csv: defineDialog({
		load: () => import('$routes/map/components/upload/form/CsvForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	tsv: defineDialog({
		load: () => import('$routes/map/components/upload/form/TsvForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	xlsx: defineDialog({
		load: () => import('$routes/map/components/upload/form/XlsxForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	pptx: defineDialog({
		load: () => import('$routes/map/components/upload/form/OfficeDrawingForm.svelte'),
		profile: 'raster-georef'
	}),
	docx: defineDialog({
		load: () => import('$routes/map/components/upload/form/OfficeDrawingForm.svelte'),
		profile: 'raster-georef'
	}),
	raster: tileDialog,
	tileurltype: defineDialog({
		load: () => import('$routes/map/components/upload/form/TileUrlTypeForm.svelte'),
		profile: 'tile-url-type'
	}),
	'3dtiles': tileDialog,
	'local-3dtiles': tileDialog,
	'local-mvt': tileDialog,
	'local-mlt': tileDialog,
	'local-raster-tiles': tileDialog,
	pointcloud: defineDialog({
		load: () => import('$routes/map/components/upload/form/PointCloudForm.svelte'),
		profile: 'pointcloud-georef'
	}),
	mbtiles: tileDialog,
	netcdf: defineDialog({
		load: () => import('$routes/map/components/upload/form/NetCDFForm.svelte'),
		profile: 'raster-georef'
	}),
	grib2: defineDialog({
		load: () => import('$routes/map/components/upload/form/Grib2Form.svelte'),
		profile: 'drop-file'
	}),
	hrit: defineDialog({
		load: () => import('$routes/map/components/upload/form/HritForm.svelte'),
		profile: 'drop-file'
	}),
	demxml: defineDialog({
		load: () => import('$routes/map/components/upload/form/DemXmlForm.svelte'),
		profile: 'raster-georef'
	}),
	pmtiles: tileDialog,
	model: defineDialog({
		load: () => import('$routes/map/components/upload/form/MeshModelForm.svelte'),
		profile: 'model-georef'
	}),
	'step-iges': defineDialog({
		load: () => import('$routes/map/components/upload/form/StepIgesForm.svelte'),
		profile: 'drop-file'
	}),
	opendrive: defineDialog({
		load: () => import('./form/OpenDriveForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	s57: defineDialog({
		load: () => import('./form/S57Form.svelte'),
		profile: 'drop-file'
	}),
	vtk: defineDialog({
		load: () => import('$routes/map/components/upload/form/VtkForm.svelte'),
		profile: 'drop-file'
	}),
	mca: defineDialog({
		load: () => import('$routes/map/components/upload/form/McaForm.svelte'),
		profile: 'drop-file'
	}),
	roblox: defineDialog({
		load: () => import('$routes/map/components/upload/form/RobloxForm.svelte'),
		profile: 'drop-file'
	}),
	'gaussian-splat': defineDialog({
		load: () => import('$routes/map/components/upload/form/GaussianSplatForm.svelte'),
		profile: 'model-georef'
	}),
	geophoto: defineDialog({
		load: () => import('$routes/map/components/upload/form/GeoPhotoForm.svelte'),
		profile: 'drop-file'
	}),
	geopdf: defineDialog({
		load: () => import('$routes/map/components/upload/form/GeoPdfForm.svelte'),
		profile: 'raster-georef'
	}),
	geotiff: defineDialog({
		load: () => import('$routes/map/components/upload/form/GeoTiffForm.svelte'),
		profile: 'pointcloud-georef'
	}),
	svg: defineDialog({
		load: () => import('$routes/map/components/upload/form/SvgForm.svelte'),
		profile: 'vector-georef'
	}),
	vector: tileDialog,
	geojson: defineDialog({
		load: () => import('$routes/map/components/upload/form/GeoJsonForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	wkt: defineDialog({
		load: () => import('$routes/map/components/upload/form/WktForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	geoparquet: defineDialog({
		load: () => import('$routes/map/components/upload/form/GeoParquetForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	geoarrow: defineDialog({
		load: () => import('$routes/map/components/upload/form/GeoArrowForm.svelte'),
		profile: 'vector-zone'
	}),
	'mapinfo-tab': defineDialog({
		load: () => import('$routes/map/components/upload/form/MapInfoTabForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	mif: defineDialog({
		load: () => import('$routes/map/components/upload/form/MifForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	mfjson: defineDialog({
		load: () => import('$routes/map/components/upload/form/MfJsonForm.svelte'),
		profile: 'drop-file'
	}),
	locationhistory: defineDialog({
		load: () => import('$routes/map/components/upload/form/LocationHistoryForm.svelte'),
		profile: 'drop-file'
	}),
	topojson: defineDialog({
		load: () => import('$routes/map/components/upload/form/TopoJsonForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	gml: defineDialog({
		load: () => import('$routes/map/components/upload/form/GmlForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	cityjson: defineDialog({
		load: () => import('$routes/map/components/upload/form/CityJsonForm.svelte'),
		profile: 'drop-file'
	}),
	citygml: defineDialog({
		load: () => import('$routes/map/components/upload/form/CityGmlForm.svelte'),
		profile: 'drop-file'
	}),
	kml: defineDialog({
		load: () => import('$routes/map/components/upload/form/KmlForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	landxml: defineDialog({
		load: () => import('$routes/map/components/upload/form/LandXmlForm.svelte'),
		profile: 'pointcloud-georef'
	}),
	gpx: defineDialog({
		load: () => import('$routes/map/components/upload/form/GpxForm.svelte'),
		profile: 'drop-file'
	}),
	tcx: defineDialog({
		load: () => import('$routes/map/components/upload/form/TcxForm.svelte'),
		profile: 'drop-file'
	}),
	ais: defineDialog({
		load: () => import('$routes/map/components/upload/form/AisForm.svelte'),
		profile: 'drop-file'
	}),
	orbit: defineDialog({
		load: () => import('$routes/map/components/upload/form/OrbitForm.svelte'),
		profile: 'drop-file'
	}),
	czml: defineDialog({
		load: () => import('$routes/map/components/upload/form/CzmlForm.svelte'),
		profile: 'drop-file'
	}),
	nmea: defineDialog({
		load: () => import('$routes/map/components/upload/form/NmeaForm.svelte'),
		profile: 'drop-file'
	}),
	fit: defineDialog({
		load: () => import('$routes/map/components/upload/form/FitForm.svelte'),
		profile: 'drop-file'
	}),
	filegdb: defineDialog({
		load: () => import('$routes/map/components/upload/form/FileGdbForm.svelte'),
		profile: 'drop-file'
	}),
	gdb: defineDialog({
		load: () => import('$routes/map/components/upload/form/GarminGDBForm.svelte'),
		profile: 'drop-file'
	}),
	osm: defineDialog({
		load: () => import('$routes/map/components/upload/form/OsmForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	georss: defineDialog({
		load: () => import('$routes/map/components/upload/form/GeoRssForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	gtfs: defineDialog({
		load: () => import('$routes/map/components/upload/form/GtfsForm.svelte'),
		profile: 'drop-file'
	}),
	drm: defineDialog({
		load: () => import('$routes/map/components/upload/form/DrmForm.svelte'),
		profile: 'drop-file'
	}),
	dm: defineDialog({
		load: () => import('$routes/map/components/upload/form/DmForm.svelte'),
		profile: 'vector-zone-georef',
		fixedHeight: true
	}),
	dwg: defineDialog({
		load: () => import('$routes/map/components/upload/form/DwgForm.svelte'),
		profile: 'vector-zone-georef',
		fixedHeight: true
	}),
	dgn: defineDialog({
		load: () => import('$routes/map/components/upload/form/DgnForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	dxf: defineDialog({
		load: () => import('$routes/map/components/upload/form/DxfForm.svelte'),
		profile: 'vector-zone-georef',
		fixedHeight: true
	}),
	jww: defineDialog({
		load: () => import('$routes/map/components/upload/form/JwwForm.svelte'),
		profile: 'vector-zone-georef',
		fixedHeight: true
	}),
	cedxm: defineDialog({
		load: () => import('$routes/map/components/upload/form/CedxmForm.svelte'),
		profile: 'vector-zone-georef',
		fixedHeight: true
	}),
	sxf: defineDialog({
		load: () => import('$routes/map/components/upload/form/SxfForm.svelte'),
		profile: 'vector-zone-georef',
		fixedHeight: true
	}),
	gpkg: defineDialog({
		load: () => import('$routes/map/components/upload/form/GpkgForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	sqlite: defineDialog({
		load: () => import('$routes/map/components/upload/form/SQLiteForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	hdf5: defineDialog({
		load: () => import('$routes/map/components/upload/form/Hdf5Form.svelte'),
		profile: 'drop-file'
	}),
	mojxml: defineDialog({
		load: () => import('$routes/map/components/upload/form/MojXmlForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	sima: defineDialog({
		load: () => import('$routes/map/components/upload/form/SimaForm.svelte'),
		profile: 'vector-zone-georef'
	}),
	bcf: defineDialog({
		load: () => import('$routes/map/components/upload/form/BcfForm.svelte'),
		profile: 'side-panel'
	})
};
