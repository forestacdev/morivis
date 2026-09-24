/** 配置ガイドなど、3Dモデルの上に描くMapLibreレイヤーの宣言。 */
export const MODEL_OVERLAY_METADATA_KEY = 'morivisAboveModels';

export const getModelOverlayBeforeId = (
	layers: { id: string; metadata?: unknown; }[]
) => layers.find((layer) =>
	typeof layer.metadata === 'object' && layer.metadata !== null
	&& (layer.metadata as Record<string, unknown>)[MODEL_OVERLAY_METADATA_KEY] === true
)?.id;
