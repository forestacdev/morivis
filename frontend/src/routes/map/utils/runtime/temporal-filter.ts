import type {
	GeoJsonMetaData,
	MorivisVectorEntry,
	TileMetaData
} from '$routes/map/data/types/vector';
import { HighlightLayerRegistry } from '$routes/map/utils/layers/highlight';
import { createSublayerId } from '$routes/map/utils/layers/id';
import { getTemporalFilter } from '$routes/map/utils/layers/vector/filter';
import { mapStore } from '$routes/stores/map';
export const getTemporalFilterLayerIds = (
	layerEntry: MorivisVectorEntry<GeoJsonMetaData | TileMetaData>
) => {
	const ids = [layerEntry.id];
	const { style } = layerEntry;

	if (style.type === 'circle') {
		if (style.imageIcon?.show) {
			return ids;
		}
		if (style.colors.show) {
			ids.push(createSublayerId(layerEntry.id, 'point_icon'));
		}
		if (style.labels.show) {
			ids.push(createSublayerId(layerEntry.id, 'label'));
		}
		return ids;
	}

	if (style.type === 'line') {
		if (style.colors.show) {
			ids.push(createSublayerId(layerEntry.id, 'line_pattern'));
		}
		if (style.labels.show) {
			ids.push(createSublayerId(layerEntry.id, 'label'));
		}
		return ids;
	}

	if (style.type === 'fill') {
		if (style.extrusion?.show) {
			if (style.colors.show) {
				ids.push(createSublayerId(layerEntry.id, 'fill_extrusion_pattern'));
			}
		} else if (style.colors.show) {
			ids.push(createSublayerId(layerEntry.id, 'fill_pattern'));
		}

		if (style.outline.show) {
			ids.push(createSublayerId(layerEntry.id, 'fill_outline'));
		}
		if (style.extrusion?.show) {
			ids.push(createSublayerId(layerEntry.id, 'fill_extrusion'));
		}
		if (style.labels.show) {
			ids.push(createSublayerId(layerEntry.id, 'label'));
		}
	}

	return ids;
};

/** 保存状態から生成するfilterを、再生中の既存レイヤーとハイライトにも適用する。 */
export const applyTemporalFilter = (entry: MorivisVectorEntry<GeoJsonMetaData | TileMetaData>) => {
	const filter = getTemporalFilter(entry) ?? null;
	HighlightLayerRegistry.setRuntimeFilter(entry.id, filter);
	for (const id of getTemporalFilterLayerIds(entry)) {
		if (mapStore.getLayer(id)) mapStore.setFilter(id, filter);
	}
};
