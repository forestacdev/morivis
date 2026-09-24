export interface PoiLayerInteraction {
	type: 'poi';
	osmIdEncoding?: 'planetiler';
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** スタイルの宣言からPOI操作を読み取る。未対応のID形式は推測しない。 */
export const getPoiLayerInteraction = (metadata: unknown): PoiLayerInteraction | null => {
	if (!isRecord(metadata)) return null;
	const interaction = metadata['morivis:interaction'];
	if (!isRecord(interaction) || interaction.type !== 'poi') return null;
	return {
		type: 'poi',
		osmIdEncoding: interaction.osmIdEncoding === 'planetiler' ? 'planetiler' : undefined
	};
};
