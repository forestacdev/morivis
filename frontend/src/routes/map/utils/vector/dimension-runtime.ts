import type { MorivisLayerEntry } from '$routes/map/data/types';
import {
	getVectorTemporalItems,
	hasVectorTemporalSourceBehavior
} from '$routes/map/data/types/vector/properties';
import type { FeatureCollection } from '$routes/map/types/geojson';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';

type VectorRuntimeDimensionUpdate = {
	type: 'geojson-data';
	sourceId: string;
	data: FeatureCollection;
};

export const getVectorDimensionCurrentIndex = (entry: MorivisLayerEntry) => {
	if (entry.type !== 'vector') return undefined;
	return entry.state?.dimension?.currentIndex;
};

export const getVectorDimension = (entry: MorivisLayerEntry) => {
	if (entry.type !== 'vector') return undefined;
	if (!hasVectorTemporalSourceBehavior(entry.properties.temporal)) return undefined;
	return entry.properties.temporal?.dimension;
};

export const getVectorDimensionValue = (entry: MorivisLayerEntry) => {
	const dimension = getVectorDimension(entry);
	const currentIndex = getVectorDimensionCurrentIndex(entry);
	if (!dimension || currentIndex == null) return undefined;
	return dimension.values[currentIndex];
};

export const canApplyVectorDimensionRuntimeUpdate = (entry: MorivisLayerEntry) => {
	if (entry.type !== 'vector') return false;
	if (entry.format.type !== 'geojson') return false;
	if (!entry.format.runtimeSource) return false;
	if (!hasVectorTemporalSourceBehavior(entry.properties.temporal)) return false;
	return Boolean(getVectorDimensionValue(entry));
};

export const getVectorDimensionRuntimeUpdates = async (
	entry: MorivisLayerEntry
): Promise<VectorRuntimeDimensionUpdate[]> => {
	if (!canApplyVectorDimensionRuntimeUpdate(entry)) return [];

	const dimensionValue = getVectorDimensionValue(entry);
	if (!dimensionValue || entry.type !== 'vector' || entry.format.type !== 'geojson') return [];

	const data = await entry.format.runtimeSource!.resolveData(dimensionValue);
	GeojsonCache.set(entry.id, data);

	return [
		{
			type: 'geojson-data',
			sourceId: `${entry.id}_source`,
			data
		}
	];
};

export const getVectorDimensionItems = (entry: MorivisLayerEntry) => {
	if (entry.type !== 'vector') return [];
	return getVectorTemporalItems(entry.properties.temporal);
};
