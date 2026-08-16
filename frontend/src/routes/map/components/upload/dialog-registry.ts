import type { Component } from 'svelte';

import ArcGisForm from '$routes/map/components/upload/form/ArcGisForm.svelte';
import CsvForm from '$routes/map/components/upload/form/CsvForm.svelte';
import DemXmlForm from '$routes/map/components/upload/form/DemXmlForm.svelte';
import DmForm from '$routes/map/components/upload/form/DmForm.svelte';
import DwgForm from '$routes/map/components/upload/form/DwgForm.svelte';
import DxfForm from '$routes/map/components/upload/form/DxfForm.svelte';
import FeatureServiceForm from '$routes/map/components/upload/form/FeatureServiceForm.svelte';
import GarminGDBForm from '$routes/map/components/upload/form/GarminGDBForm.svelte';
import GeoArrowForm from '$routes/map/components/upload/form/GeoArrowForm.svelte';
import GeoJsonForm from '$routes/map/components/upload/form/GeoJsonForm.svelte';
import GeoParquetForm from '$routes/map/components/upload/form/GeoParquetForm.svelte';
import GeoPdfForm from '$routes/map/components/upload/form/GeoPdfForm.svelte';
import GeoPhotoForm from '$routes/map/components/upload/form/GeoPhotoForm.svelte';
import GeoRssForm from '$routes/map/components/upload/form/GeoRssForm.svelte';
import GeoTiffForm from '$routes/map/components/upload/form/GeoTiffForm.svelte';
import GeoZarrForm from '$routes/map/components/upload/form/GeoZarrForm.svelte';
import GmlForm from '$routes/map/components/upload/form/GmlForm.svelte';
import GpkgForm from '$routes/map/components/upload/form/GpkgForm.svelte';
import GpxForm from '$routes/map/components/upload/form/GpxForm.svelte';
import Grib2Form from '$routes/map/components/upload/form/Grib2Form.svelte';
import GtfsForm from '$routes/map/components/upload/form/GtfsForm.svelte';
import Hdf5Form from '$routes/map/components/upload/form/Hdf5Form.svelte';
import HritForm from '$routes/map/components/upload/form/HritForm.svelte';
import KmlForm from '$routes/map/components/upload/form/KmlForm.svelte';
import LandXmlForm from '$routes/map/components/upload/form/LandXmlForm.svelte';
import LocationHistoryForm from '$routes/map/components/upload/form/LocationHistoryForm.svelte';
import MBTilesForm from '$routes/map/components/upload/form/MBTilesForm.svelte';
import MeshModelForm from '$routes/map/components/upload/form/MeshModelForm.svelte';
import MfJsonForm from '$routes/map/components/upload/form/MfJsonForm.svelte';
import MifForm from '$routes/map/components/upload/form/MifForm.svelte';
import MojXmlForm from '$routes/map/components/upload/form/MojXmlForm.svelte';
import NetCDFForm from '$routes/map/components/upload/form/NetCDFForm.svelte';
import OsmForm from '$routes/map/components/upload/form/OsmForm.svelte';
import PmtilesForm from '$routes/map/components/upload/form/PmtilesForm.svelte';
import PointCloudForm from '$routes/map/components/upload/form/PointCloudForm.svelte';
import RasterForm from '$routes/map/components/upload/form/RasterForm.svelte';
import SimaForm from '$routes/map/components/upload/form/SimaForm.svelte';
import SQLiteForm from '$routes/map/components/upload/form/SQLiteForm.svelte';
import StacForm from '$routes/map/components/upload/form/StacForm.svelte';
import SvgForm from '$routes/map/components/upload/form/SvgForm.svelte';
import TcxForm from '$routes/map/components/upload/form/TcxForm.svelte';
import Tiles3DForm from '$routes/map/components/upload/form/Tiles3DForm.svelte';
import TileUrlTypeForm from '$routes/map/components/upload/form/TileUrlTypeForm.svelte';
import TopoJsonForm from '$routes/map/components/upload/form/TopoJsonForm.svelte';
import TsvForm from '$routes/map/components/upload/form/TsvForm.svelte';
import VectorForm from '$routes/map/components/upload/form/VectorForm.svelte';
import WcsForm from '$routes/map/components/upload/form/WcsForm.svelte';
import WktForm from '$routes/map/components/upload/form/WktForm.svelte';
import WmtsForm from '$routes/map/components/upload/form/WmtsForm.svelte';
import XlsxForm from '$routes/map/components/upload/form/XlsxForm.svelte';
import type { DialogType } from '$routes/map/types';

export type DialogProfile =
	| 'simple'
	| 'drop-file'
	| 'model-georef'
	| 'vector-zone'
	| 'vector-zone-georef'
	| 'raster-georef'
	| 'pointcloud-georef'
	| 'feature-service'
	| 'remote-wmts'
	| 'remote-geozarr'
	| 'remote-raster'
	| 'remote-vector'
	| 'remote-3dtiles'
	| 'remote-pmtiles'
	| 'wcs'
	| 'tile-url-type'
	| 'vector-georef';

export interface DialogDefinition {
	component: Component<any>;
	profile: DialogProfile;
	fixedHeight?: boolean;
}

export const dialogRegistry: Partial<Record<Exclude<DialogType, null>, DialogDefinition>> = {
	wmts: { component: WmtsForm, profile: 'remote-wmts' },
	wcs: { component: WcsForm, profile: 'wcs' },
	geozarr: { component: GeoZarrForm, profile: 'remote-geozarr' },
	featureservice: { component: FeatureServiceForm, profile: 'feature-service' },
	wfs: { component: FeatureServiceForm, profile: 'feature-service' },
	ogcapifeatures: { component: FeatureServiceForm, profile: 'feature-service' },
	stac: { component: StacForm, profile: 'simple' },
	arcgis: { component: ArcGisForm, profile: 'simple' },
	csv: { component: CsvForm, profile: 'vector-zone-georef' },
	tsv: { component: TsvForm, profile: 'vector-zone-georef' },
	xlsx: { component: XlsxForm, profile: 'vector-zone-georef' },
	raster: { component: RasterForm, profile: 'remote-raster' },
	tileurltype: { component: TileUrlTypeForm, profile: 'tile-url-type' },
	'3dtiles': { component: Tiles3DForm, profile: 'remote-3dtiles' },
	pointcloud: { component: PointCloudForm, profile: 'pointcloud-georef' },
	mbtiles: { component: MBTilesForm, profile: 'drop-file' },
	netcdf: { component: NetCDFForm, profile: 'raster-georef' },
	grib2: { component: Grib2Form, profile: 'drop-file' },
	hrit: { component: HritForm, profile: 'drop-file' },
	demxml: { component: DemXmlForm, profile: 'raster-georef' },
	pmtiles: { component: PmtilesForm, profile: 'remote-pmtiles' },
	glb: { component: MeshModelForm, profile: 'model-georef' },
	geophoto: { component: GeoPhotoForm, profile: 'drop-file' },
	geopdf: { component: GeoPdfForm, profile: 'raster-georef' },
	geotiff: { component: GeoTiffForm, profile: 'pointcloud-georef' },
	svg: { component: SvgForm, profile: 'vector-georef' },
	vector: { component: VectorForm, profile: 'remote-vector' },
	geojson: { component: GeoJsonForm, profile: 'vector-zone-georef' },
	wkt: { component: WktForm, profile: 'vector-zone-georef' },
	geoparquet: { component: GeoParquetForm, profile: 'vector-zone-georef' },
	geoarrow: { component: GeoArrowForm, profile: 'vector-zone' },
	mif: { component: MifForm, profile: 'vector-zone-georef' },
	mfjson: { component: MfJsonForm, profile: 'drop-file' },
	locationhistory: { component: LocationHistoryForm, profile: 'drop-file' },
	topojson: { component: TopoJsonForm, profile: 'vector-zone-georef' },
	gml: { component: GmlForm, profile: 'vector-zone-georef' },
	kml: { component: KmlForm, profile: 'vector-zone-georef' },
	landxml: { component: LandXmlForm, profile: 'pointcloud-georef' },
	gpx: { component: GpxForm, profile: 'drop-file' },
	tcx: { component: TcxForm, profile: 'drop-file' },
	gdb: { component: GarminGDBForm, profile: 'drop-file' },
	osm: { component: OsmForm, profile: 'vector-zone-georef' },
	georss: { component: GeoRssForm, profile: 'vector-zone-georef' },
	gtfs: { component: GtfsForm, profile: 'drop-file' },
	dm: { component: DmForm, profile: 'vector-zone-georef', fixedHeight: true },
	dwg: { component: DwgForm, profile: 'vector-zone-georef', fixedHeight: true },
	dxf: { component: DxfForm, profile: 'vector-zone-georef', fixedHeight: true },
	gpkg: { component: GpkgForm, profile: 'vector-zone-georef' },
	sqlite: { component: SQLiteForm, profile: 'vector-zone-georef' },
	hdf5: { component: Hdf5Form, profile: 'drop-file' },
	mojxml: { component: MojXmlForm, profile: 'vector-zone-georef' },
	sima: { component: SimaForm, profile: 'vector-zone-georef' }
};
