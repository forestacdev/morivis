import { format3dm } from './3dm/definition';
import { format3ds } from './3ds/definition';
import { format3mf } from './3mf/definition';
import { formatAmf } from './amf/definition';
import { formatArcgis } from './arcgis/definition';
import { formatAsciiGrid } from './ascii-grid/definition';
import { formatBcf } from './bcf/definition';
import { formatBds } from './bds/definition';
import { formatCedxm } from './cedxm/definition';
import { formatCitygml } from './citygml/definition';
import { formatCityjson } from './cityjson/definition';
import { formatCsv } from './csv/definition';
import { formatCzml } from './czml/definition';
import { formatDae } from './dae/definition';
import { formatDgn } from './dgn/definition';
import { formatDm } from './dm/definition';
import { formatDocx } from './docx/definition';
import { formatDrc } from './drc/definition';
import { formatMt } from './drm/definition';
import { formatDxf } from './dxf/definition';
import { formatEnviBil } from './envi-bil/definition';
import { formatGeophoto } from './exif/definition';
import { formatFbx } from './fbx/definition';
import { formatFeatureservice } from './featureservice/definition';
import { formatFgb } from './fgb/definition';
import { formatFilegdb } from './filegdb/definition';
import { formatFit } from './fit/definition';
import { formatGdb } from './garmin-gdb/definition';
import { formatGcd } from './gcd/definition';
import { formatGeoarrow } from './geoarrow/definition';
import { formatGeojson } from './geojson/definition';
import { formatGeojsonseq } from './geojsonseq/definition';
import { formatParquet } from './geoparquet/definition';
import { formatPdf } from './geopdf/definition';
import { formatGeorss } from './georss/definition';
import { formatTif } from './geotiff/definition';
import { formatGeoZarr } from './geozarr/definition';
import { formatGlb } from './gltf/definition';
import { formatGml } from './gml/definition';
import { formatGpkg } from './gpkg/definition';
import { formatGpx } from './gpx/definition';
import { formatGrib2 } from './grib2/definition';
import { formatZip } from './gtfs/definition';
import { formatH5 } from './hdf5/definition';
import { formatHgt } from './hgt/definition';
import { formatBz2 } from './hrit/definition';
import { formatIfc } from './ifc/definition';
import { formatJpeg2000 } from './jpeg2000/definition';
import { formatJww } from './jww/definition';
import { formatKml } from './kml/definition';
import { formatLandxml } from './landxml/definition';
import { formatMapinfoTab } from './mapinfo-tab/definition';
import { formatMbtiles } from './mbtiles/definition';
import { formatMca } from './mca/definition';
import { formatMif } from './mif/definition';
import { formatMojxml } from './mojxml/definition';
import { formatNc } from './netcdf/definition';
import { formatNmea } from './nmea/definition';
import { formatObj } from './obj/definition';
import { formatOpenDrive } from './opendrive/definition';
import { formatOrbit } from './orbit/definition';
import { formatOsm } from './osm/definition';
import { formatPmtiles } from './pmtiles/definition';
import { formatPmx } from './pmx/definition';
import { formatPointcloud } from './pointcloud/definition';
import { formatPptx } from './pptx/definition';
import { formatRaster } from './raster/definition';
import { formatRik } from './rik/definition';
import { formatRoblox } from './roblox/definition';
import { formatS57 } from './s57/definition';
import { formatShp } from './shp/definition';
import { formatSim } from './sima/definition';
import { formatSpz } from './spz/definition';
import { formatSqlite } from './sqlite/definition';
import { formatStac } from './stac/definition';
import { formatStepIges } from './step-iges/definition';
import { formatStl } from './stl/definition';
import { formatSvg } from './svg/definition';
import { formatSfc } from './sxf/definition';
import { formatTcx } from './tcx/definition';
import { format3dtiles } from './tiles3d/definition';
import { formatTopojson } from './topojson/definition';
import { formatTsv } from './tsv/definition';
import { formatUsd } from './usd/definition';
import { formatVector } from './vector/definition';
import { formatVideo } from './video/definition';
import { formatVrm } from './vrm/definition';
import { formatVrml } from './vrml/definition';
import { formatVtk } from './vtk/definition';
import { formatWcs } from './wcs/definition';
import { formatWkt } from './wkt/definition';
import { formatWmts } from './wmts/definition';
import { formatXlsx } from './xlsx/definition';

export const FORMAT_DEFINITIONS = {
	'raster': formatRaster,
	'vector': formatVector,
	'wmts': formatWmts,
	'wcs': formatWcs,
	'featureservice': formatFeatureservice,
	'arcgis': formatArcgis,
	'pmtiles': formatPmtiles,
	'mbtiles': formatMbtiles,
	'3dtiles': format3dtiles,
	'stac': formatStac,
	'geozarr': formatGeoZarr,
	'geojson': formatGeojson,
	'geojsonseq': formatGeojsonseq,
	'wkt': formatWkt,
	'topojson': formatTopojson,
	'fgb': formatFgb,
	'parquet': formatParquet,
	'geoarrow': formatGeoarrow,
	'mapinfo-tab': formatMapinfoTab,
	'mif': formatMif,
	'bds': formatBds,
	'gcd': formatGcd,
	'gpkg': formatGpkg,
	'sqlite': formatSqlite,
	'filegdb': formatFilegdb,
	'shp': formatShp,
	's57': formatS57,
	'gpx': formatGpx,
	'tcx': formatTcx,
	'fit': formatFit,
	'nmea': formatNmea,
	'czml': formatCzml,
	'orbit': formatOrbit,
	'gdb': formatGdb,
	'osm': formatOsm,
	'georss': formatGeorss,
	'sfc': formatSfc,
	'gml': formatGml,
	'cityjson': formatCityjson,
	'citygml': formatCitygml,
	'kml': formatKml,
	'csv': formatCsv,
	'tsv': formatTsv,
	'xlsx': formatXlsx,
	'pptx': formatPptx,
	'docx': formatDocx,
	'tif': formatTif,
	'jpeg2000': formatJpeg2000,
	'envi-bil': formatEnviBil,
	'ascii-grid': formatAsciiGrid,
	'hgt': formatHgt,
	'h5': formatH5,
	'nc': formatNc,
	'grib2': formatGrib2,
	'zip': formatZip,
	'bz2': formatBz2,
	'dxf': formatDxf,
	'dgn': formatDgn,
	'jww': formatJww,
	'cedxm': formatCedxm,
	'sim': formatSim,
	'mt': formatMt,
	'dm': formatDm,
	'landxml': formatLandxml,
	'opendrive': formatOpenDrive,
	'mojxml': formatMojxml,
	'geophoto': formatGeophoto,
	'video': formatVideo,
	'svg': formatSvg,
	'pdf': formatPdf,
	'pointcloud': formatPointcloud,
	'spz': formatSpz,
	'glb': formatGlb,
	'usd': formatUsd,
	'obj': formatObj,
	'3ds': format3ds,
	'rik': formatRik,
	'dae': formatDae,
	'3dm': format3dm,
	'vrml': formatVrml,
	'fbx': formatFbx,
	'drc': formatDrc,
	'3mf': format3mf,
	'amf': formatAmf,
	'step-iges': formatStepIges,
	'stl': formatStl,
	'vtk': formatVtk,
	'ifc': formatIfc,
	'bcf': formatBcf,
	'vrm': formatVrm,
	'pmx': formatPmx,
	'mca': formatMca,
	'roblox': formatRoblox
} as const;

export type FormatId = keyof typeof FORMAT_DEFINITIONS;

/** 拡張子判定はUIの表示順・説明文に依存しない。 */
export const FORMAT_FILE_EXTENSIONS = Object.values(FORMAT_DEFINITIONS).flatMap(
	definition => [...definition.extensions]
);
