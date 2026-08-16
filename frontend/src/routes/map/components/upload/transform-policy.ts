import type { ActiveTransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
import type { DialogType } from '$routes/map/types';

export type SpatialIssue = 'resolved' | 'crs-missing' | 'placement-missing';
export type TransformChoice = 'none' | 'zone-only' | 'georef-only' | 'zone-or-georef';

export interface TransformPolicy {
	onCrsMissing: TransformChoice;
	onPlacementMissing: TransformChoice;
	defaultMode?: ActiveTransformOptionMode;
}

type TransformDialogType = Exclude<DialogType, null>;

const TRANSFORM_MODES_BY_CHOICE: Record<TransformChoice, ActiveTransformOptionMode[]> = {
	none: [],
	'zone-only': ['zone'],
	'georef-only': ['georef'],
	'zone-or-georef': ['zone', 'georef']
};

const createPolicy = (
	onCrsMissing: TransformChoice,
	onPlacementMissing: TransformChoice,
	defaultMode?: ActiveTransformOptionMode
): TransformPolicy => ({
	onCrsMissing,
	onPlacementMissing,
	defaultMode
});

const DIALOG_TRANSFORM_POLICIES: Partial<Record<TransformDialogType, TransformPolicy>> = {
	shp: createPolicy('zone-or-georef', 'none', 'zone'),
	csv: createPolicy('zone-or-georef', 'none', 'zone'),
	tsv: createPolicy('zone-or-georef', 'none', 'zone'),
	xlsx: createPolicy('zone-or-georef', 'none', 'zone'),
	geojson: createPolicy('zone-or-georef', 'none', 'zone'),
	wkt: createPolicy('zone-or-georef', 'none', 'zone'),
	geoparquet: createPolicy('zone-or-georef', 'none', 'zone'),
	mif: createPolicy('zone-or-georef', 'none', 'zone'),
	topojson: createPolicy('zone-or-georef', 'none', 'zone'),
	gml: createPolicy('zone-or-georef', 'none', 'zone'),
	kml: createPolicy('zone-or-georef', 'none', 'zone'),
	osm: createPolicy('zone-or-georef', 'none', 'zone'),
	georss: createPolicy('zone-only', 'none', 'zone'),
	featureservice: createPolicy('zone-or-georef', 'none', 'zone'),
	wfs: createPolicy('zone-or-georef', 'none', 'zone'),
	ogcapifeatures: createPolicy('zone-or-georef', 'none', 'zone'),
	dm: createPolicy('zone-or-georef', 'none', 'zone'),
	dwg: createPolicy('zone-or-georef', 'none', 'zone'),
	dxf: createPolicy('zone-or-georef', 'none', 'zone'),
	gpkg: createPolicy('zone-or-georef', 'none', 'zone'),
	sqlite: createPolicy('zone-or-georef', 'none', 'zone'),
	mojxml: createPolicy('zone-or-georef', 'none', 'zone'),
	sima: createPolicy('zone-or-georef', 'none', 'zone'),
	geoarrow: createPolicy('zone-only', 'none', 'zone'),
	geotiff: createPolicy('zone-only', 'georef-only', 'zone'),
	pointcloud: createPolicy('zone-only', 'georef-only', 'zone'),
	landxml: createPolicy('zone-only', 'georef-only', 'zone'),
	glb: createPolicy('zone-only', 'none', 'zone'),
	geopdf: createPolicy('none', 'georef-only', 'georef'),
	svg: createPolicy('none', 'georef-only', 'georef'),
	demxml: createPolicy('none', 'georef-only', 'georef'),
	netcdf: createPolicy('none', 'georef-only', 'georef')
};

export const getDialogTransformPolicy = (dialogType: DialogType): TransformPolicy | null => {
	if (!dialogType) return null;
	return DIALOG_TRANSFORM_POLICIES[dialogType] ?? null;
};

export const getAllowedTransformModesForIssue = (
	dialogType: DialogType,
	issue: Exclude<SpatialIssue, 'resolved'>
): ActiveTransformOptionMode[] => {
	const policy = getDialogTransformPolicy(dialogType);
	if (!policy) return [];

	const choice = issue === 'crs-missing' ? policy.onCrsMissing : policy.onPlacementMissing;
	return TRANSFORM_MODES_BY_CHOICE[choice];
};

export const getDefaultTransformModeForIssue = (
	dialogType: DialogType,
	issue: Exclude<SpatialIssue, 'resolved'>
): ActiveTransformOptionMode | null => {
	const policy = getDialogTransformPolicy(dialogType);
	const allowedModes = getAllowedTransformModesForIssue(dialogType, issue);
	if (allowedModes.length === 0) return null;

	if (policy?.defaultMode && allowedModes.includes(policy.defaultMode)) {
		return policy.defaultMode;
	}

	return allowedModes[0] ?? null;
};
