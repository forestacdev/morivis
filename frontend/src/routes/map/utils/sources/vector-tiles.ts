import type { BaseMetaData } from '$routes/map/data/types';
import type { MorivisVectorEntry } from '$routes/map/data/types/vector';
import type { VectorSourceSpecification } from '$routes/map/utils/maplibre';

export const createVectorTileSource = (
	entry: MorivisVectorEntry<BaseMetaData>
): VectorSourceSpecification => {
	const { format, metaData } = entry;
	return {
		type: 'vector',
		encoding: format.type === 'mlt' ? 'mlt' : 'mvt',
		tiles: [format.url],
		maxzoom: metaData.maxZoom,
		minzoom: metaData.minZoom,
		promoteId: 'promoteId' in metaData ? metaData.promoteId as string : undefined,
		attribution: metaData.attribution,
		bounds: metaData.bounds
	};
};
