export const SUBLAYER_ID_SEPARATOR = ':::';

export const SUBLAYER_TYPES = [
	// ポリゴン押し出しのパターン表示
	'fill_extrusion_pattern',
	// ポリゴン押し出し本体
	'fill_extrusion',
	// ポリゴン塗りつぶしのパターン表示
	'fill_pattern',
	// ポリゴン外周線
	'fill_outline',
	// ラインのパターン表示
	'line_pattern',
	// ポイントのアイコン
	'point_icon',
	// ポイントのアイコン（画像）表示
	'point_image',
	// ラベル
	// ベクターラベル表示
	'label'
] as const;

export type SublayerType = (typeof SUBLAYER_TYPES)[number];
export type MorivisLayerRole = 'base' | 'highlight' | 'auxiliary' | SublayerType;

const MORIVIS_LOGICAL_LAYER_ID_KEY = 'morivis:logicalLayerId';
const MORIVIS_LAYER_ROLE_KEY = 'morivis:layerRole';
const MORIVIS_IS_SUBLAYER_KEY = 'morivis:isSublayer';

type MetadataRecord = Record<string, unknown>;

const getSublayerSuffix = (type: SublayerType) => {
	return `${SUBLAYER_ID_SEPARATOR}${type}`;
};

export const createSublayerId = (baseId: string, type: SublayerType) => {
	return `${baseId}${getSublayerSuffix(type)}`;
};

const isMetadataRecord = (metadata: unknown): metadata is MetadataRecord => {
	return typeof metadata === 'object' && metadata !== null;
};

export const parseSublayerId = (layerId: string): { baseId: string; type: SublayerType } | null => {
	for (const type of SUBLAYER_TYPES) {
		const suffix = getSublayerSuffix(type);
		if (!layerId.endsWith(suffix)) continue;

		return {
			baseId: layerId.slice(0, -suffix.length),
			type
		};
	}

	return null;
};

export const isSublayerId = (layerId: string) => {
	return parseSublayerId(layerId) !== null;
};

export const getSublayerBaseId = (layerId: string) => {
	return parseSublayerId(layerId)?.baseId ?? layerId;
};

export const createMorivisLayerMetadata = (
	logicalLayerId: string,
	role: MorivisLayerRole,
	metadata?: unknown
) => {
	const baseMetadata = isMetadataRecord(metadata) ? metadata : {};

	return {
		...baseMetadata,
		[MORIVIS_LOGICAL_LAYER_ID_KEY]: logicalLayerId,
		[MORIVIS_LAYER_ROLE_KEY]: role,
		[MORIVIS_IS_SUBLAYER_KEY]: role !== 'base' && role !== 'highlight' && role !== 'auxiliary'
	};
};

export const getMorivisLogicalLayerId = (metadata: unknown) => {
	if (!isMetadataRecord(metadata)) return null;
	const logicalLayerId = metadata[MORIVIS_LOGICAL_LAYER_ID_KEY];
	return typeof logicalLayerId === 'string' ? logicalLayerId : null;
};

export const getMorivisLayerRole = (metadata: unknown): MorivisLayerRole | null => {
	if (!isMetadataRecord(metadata)) return null;
	const role = metadata[MORIVIS_LAYER_ROLE_KEY];
	return typeof role === 'string' ? (role as MorivisLayerRole) : null;
};
