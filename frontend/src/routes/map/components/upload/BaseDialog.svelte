<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	import ArcGisForm from '$routes/map/components/upload/form/ArcGisForm.svelte';
	import CsvForm from '$routes/map/components/upload/form/CsvForm.svelte';
	import DemXmlForm from '$routes/map/components/upload/form/DemXmlForm.svelte';
	import DmForm from '$routes/map/components/upload/form/DmForm.svelte';
	import DxfForm from '$routes/map/components/upload/form/DxfForm.svelte';
	import FeatureServiceForm from '$routes/map/components/upload/form/FeatureServiceForm.svelte';
	import GarminGDBForm from '$routes/map/components/upload/form/GarminGDBForm.svelte';
	import GeoArrowForm from '$routes/map/components/upload/form/GeoArrowForm.svelte';
	import GeoJsonForm from '$routes/map/components/upload/form/GeoJsonForm.svelte';
	import GeoParquetForm from '$routes/map/components/upload/form/GeoParquetForm.svelte';
	import GeoPdfForm from '$routes/map/components/upload/form/GeoPdfForm.svelte';
	import GeoPhotoForm from '$routes/map/components/upload/form/GeoPhotoForm.svelte';
	import type { GeoRefData } from '$routes/map/components/upload/form/GeoRefForm.svelte';
	import GeoTiffForm from '$routes/map/components/upload/form/GeoTiffForm.svelte';
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
	import ShapeFileForm from '$routes/map/components/upload/form/ShapeFileForm.svelte';
	import SimaForm from '$routes/map/components/upload/form/SimaForm.svelte';
	import StacForm from '$routes/map/components/upload/form/StacForm.svelte';
	import TcxForm from '$routes/map/components/upload/form/TcxForm.svelte';
	import Tiles3DForm from '$routes/map/components/upload/form/Tiles3DForm.svelte';
	import TileUrlTypeForm from '$routes/map/components/upload/form/TileUrlTypeForm.svelte';
	import TopoJsonForm from '$routes/map/components/upload/form/TopoJsonForm.svelte';
	import TsvForm from '$routes/map/components/upload/form/TsvForm.svelte';
	import VectorForm from '$routes/map/components/upload/form/VectorForm.svelte';
	import WcsForm from '$routes/map/components/upload/form/WcsForm.svelte';
	import WmtsForm from '$routes/map/components/upload/form/WmtsForm.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import { type EpsgCode } from '$routes/map/utils/proj/dict';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDialogType: DialogType;
		tempLayerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null;
		showZoneForm: boolean;
		selectedEpsgCode: EpsgCode;
		dropFile: File | FileList | null;
		remotePmtilesUrl: string | null;
		remoteRasterUrl: string | null;
		remoteVectorUrl: string | null;
		remoteTiles3dUrl: string | null;
		remoteWmtsUrl: string | null;
		remoteFeatureServiceUrl: string | null;
		pendingTileUrl: string | null;
		focusBbox: [number, number, number, number] | null;
		isDragover: boolean;
		zoneConfirmedEpsg: EpsgCode | null;
		showGeoRefForm: boolean;
		geoRefData: GeoRefData | null;
	}

	let {
		showDialogType = $bindable(),
		showDataEntry = $bindable(),
		tempLayerEntries = $bindable(),
		showZoneForm = $bindable(),
		selectedEpsgCode,
		dropFile = $bindable(),
		remotePmtilesUrl = $bindable(),
		remoteRasterUrl = $bindable(),
		remoteVectorUrl = $bindable(),
		remoteTiles3dUrl = $bindable(),
		remoteWmtsUrl = $bindable(),
		remoteFeatureServiceUrl = $bindable(),
		pendingTileUrl = $bindable(),
		focusBbox = $bindable(),
		isDragover = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		showGeoRefForm = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();

	let isFixedHeight = $derived(showDialogType === 'dxf' || showDialogType === 'dm');
</script>

{#if showDialogType && showDialogType !== 'shp'}
	<div
		transition:fade={{ duration: 200 }}
		class="absolute bottom-0 z-30 flex h-full w-full items-center justify-center bg-black/50 {showZoneForm
			? 'pointer-events-none opacity-0'
			: ''}"
	>
		<div
			transition:scale={{ duration: 300, start: 0.9 }}
			class="bg-opacity-8 bg-main flex max-w-[600px] grow flex-col rounded-md p-4 text-base {isFixedHeight
				? 'h-[600px]'
				: 'max-h-[700px]'}"
		>
			{#if showDialogType === 'wmts'}
				<WmtsForm bind:showDataEntry bind:showDialogType bind:remoteWmtsUrl />
			{/if}
			{#if showDialogType === 'wcs'}
				<WcsForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'featureservice' || showDialogType === 'wfs' || showDialogType === 'ogcapifeatures'}
				<FeatureServiceForm
					bind:showDataEntry
					bind:showDialogType
					bind:remoteFeatureServiceUrl
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'stac'}
				<StacForm bind:showDataEntry bind:showDialogType />
			{/if}
			{#if showDialogType === 'arcgis'}
				<ArcGisForm bind:showDataEntry bind:showDialogType />
			{/if}
			{#if showDialogType === 'csv'}
				<CsvForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'tsv'}
				<TsvForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'raster'}
				<RasterForm bind:showDataEntry bind:showDialogType bind:remoteRasterUrl />
			{/if}
			{#if showDialogType === 'tileurltype'}
				<TileUrlTypeForm
					bind:showDialogType
					bind:pendingTileUrl
					bind:remoteRasterUrl
					bind:remoteVectorUrl
				/>
			{/if}
			{#if showDialogType === '3dtiles'}
				<Tiles3DForm bind:showDataEntry bind:showDialogType bind:remoteTiles3dUrl />
			{/if}
			{#if showDialogType === 'pointcloud'}
				<PointCloudForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'mbtiles'}
				<MBTilesForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'netcdf'}
				<NetCDFForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'grib2'}
				<Grib2Form bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'hrit'}
				<HritForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'demxml'}
				<DemXmlForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'pmtiles'}
				<PmtilesForm bind:showDataEntry bind:showDialogType bind:dropFile bind:remotePmtilesUrl />
			{/if}
			{#if showDialogType === 'glb'}
				<MeshModelForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'geophoto'}
				<GeoPhotoForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'geopdf'}
				<GeoPdfForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showGeoRefForm
					bind:geoRefData
				/>
			{/if}
			{#if showDialogType === 'geotiff'}
				<GeoTiffForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					bind:showGeoRefForm
					bind:geoRefData
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'vector'}
				<VectorForm bind:showDataEntry bind:showDialogType bind:remoteVectorUrl />
			{/if}
			{#if showDialogType === 'geojson'}
				<GeoJsonForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'geoparquet'}
				<GeoParquetForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'geoarrow'}
				<GeoArrowForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'mif'}
				<MifForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'mfjson'}
				<MfJsonForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'locationhistory'}
				<LocationHistoryForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'topojson'}
				<TopoJsonForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'gml'}
				<GmlForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'kml'}
				<KmlForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'landxml'}
				<LandXmlForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'gpx'}
				<GpxForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'tcx'}
				<TcxForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'gdb'}
				<GarminGDBForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'osm'}
				<OsmForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'gtfs'}
				<GtfsForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'dm'}
				<DmForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'dxf'}
				<DxfForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'gpkg'}
				<GpkgForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'hdf5'}
				<Hdf5Form bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'mojxml'}
				<MojXmlForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'sima'}
				<SimaForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
		</div>
	</div>
{/if}

{#if !$isProcessing}
	<ShapeFileForm
		bind:showDataEntry
		bind:showDialogType
		bind:dropFile
		bind:isDragover
		bind:showZoneForm
		bind:focusBbox
		bind:zoneConfirmedEpsg
		{selectedEpsgCode}
	/>
{/if}

<style>
</style>
