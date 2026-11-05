import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { DialogType, UploadFiles } from '$routes/map/types';
import type { EpsgCode } from '$routes/map/utils/proj/dict';
import type { PendingZoneGeoRefData, TransformOptionMode } from './form/pending-zone-vector';
import type { GeoRefData } from './form/transform/georef-types';

/** アップロード画面が保持し、必要なものだけ各フォームへ渡す状態。 */
export interface UploadDialogState {
	showDataEntry: MorivisLayerEntry | null;
	showDialogType: DialogType;
	transformOptionMode: TransformOptionMode;
	selectedEpsgCode: EpsgCode;
	dropFile: UploadFiles;
	remoteGeoZarrUrl: string | null;
	remotePmtilesUrl: string | null;
	remoteRasterUrl: string | null;
	remoteVectorUrl: string | null;
	remoteTiles3dUrl: string | null;
	remoteWmtsUrl: string | null;
	remoteFeatureServiceUrl: string | null;
	remoteArcGisUrl: string | null;
	remoteStacUrl: string | null;
	remoteCswUrl: string | null;
	pendingTileUrl: string | null;
	focusBbox: [number, number, number, number] | null;
	isDragover: boolean;
	zoneConfirmedEpsg: EpsgCode | null;
	pendingZoneGeoRefData: PendingZoneGeoRefData | null;
	geoRefData: GeoRefData | null;
}

type PreviewProps = Pick<UploadDialogState, 'showDataEntry' | 'showDialogType'>;
type FileProps = PreviewProps & Pick<UploadDialogState, 'dropFile'>;
type ZoneProps = Pick<
	UploadDialogState,
	'transformOptionMode' | 'focusBbox' | 'zoneConfirmedEpsg' | 'selectedEpsgCode'
>;
type RasterGeoRefProps = FileProps & Pick<UploadDialogState, 'transformOptionMode' | 'geoRefData'>;

/** DialogRendererが各profileに渡すpropsの契約。 */
export interface DialogPropsByProfile {
	simple: PreviewProps;
	'drop-file': FileProps;
	'side-panel': FileProps;
	'model-georef': FileProps & ZoneProps;
	'vector-zone': FileProps & ZoneProps;
	'vector-zone-georef':
		& FileProps
		& ZoneProps
		& Pick<UploadDialogState, 'geoRefData' | 'pendingZoneGeoRefData' | 'isDragover'>;
	'vector-georef': RasterGeoRefProps & Pick<UploadDialogState, 'focusBbox'>;
	'raster-georef': RasterGeoRefProps;
	'pointcloud-georef': RasterGeoRefProps & ZoneProps;
	'feature-service':
		& PreviewProps
		& ZoneProps
		& Pick<UploadDialogState, 'remoteFeatureServiceUrl' | 'pendingZoneGeoRefData'>;
	'remote-csw': Pick<UploadDialogState, 'showDialogType' | 'remoteCswUrl'> & {
		onimporturl: (url: string, signal: AbortSignal) => Promise<void>;
	};
	'remote-stac': PreviewProps & Pick<UploadDialogState, 'remoteStacUrl'>;
	'remote-arcgis': PreviewProps & Pick<UploadDialogState, 'remoteArcGisUrl'>;
	'remote-wmts': PreviewProps & Pick<UploadDialogState, 'remoteWmtsUrl'>;
	'remote-geozarr': FileProps & Pick<UploadDialogState, 'remoteGeoZarrUrl'>;
	tiles:
		& FileProps
		& Pick<
			UploadDialogState,
			'remoteRasterUrl' | 'remoteVectorUrl' | 'remoteTiles3dUrl' | 'remotePmtilesUrl'
		>;
	wcs: FileProps;
	'tile-url-type': Pick<
		UploadDialogState,
		'showDialogType' | 'pendingTileUrl' | 'remoteRasterUrl' | 'remoteVectorUrl'
	>;
}

export type DialogProfile = keyof DialogPropsByProfile;
