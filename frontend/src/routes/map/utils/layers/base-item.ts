import type { MorivisLayerEntry } from '$routes/map/data/types';
import { createMorivisLayerMetadata } from './id';
import type { LayerItem } from './index';

export const createBaseLayerItem = (entry: MorivisLayerEntry): LayerItem => {
	const { metaData, style } = entry;

	return {
		id: `${entry.id}`,
		source: `${entry.id}_source`,
		maxzoom: 'maxZoom' in style ? (style.maxZoom ?? 24) : 24,
		minzoom: 'minZoom' in style
			? (style.minZoom ?? metaData.minZoom ?? 1)
			: (metaData.minZoom ?? 1),
		metadata: createMorivisLayerMetadata(entry.id, 'base')
	};
};
