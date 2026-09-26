import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { RasterTiffStyle } from '$routes/map/data/types/raster';
import { getRasterDimensionCurrentIndex } from '$routes/map/utils/raster/dimension-runtime';

type Visualization = RasterTiffStyle['visualization'];
export interface RasterVisualizationUpdate {
	entryId: string;
	currentIndex: number;
	before: Visualization;
	after: Visualization;
}

/** 採用するstyleに対応する時間軸のrangeをUIへ同期する。準備中のユーザー編集は上書きしない。 */
export const applyRasterVisualizationUpdates = (
	entries: MorivisLayerEntry[],
	updates: RasterVisualizationUpdate[]
) => {
	for (const update of updates) {
		const entry = entries.find((entry) => entry.id === update.entryId);
		if (
			!entry || entry.type !== 'raster' || entry.format.type !== 'image'
			|| entry.style.type !== 'tiff'
		) continue;
		if (getRasterDimensionCurrentIndex(entry) !== update.currentIndex) continue;
		if (JSON.stringify(entry.style.visualization) !== JSON.stringify(update.before)) continue;
		if (JSON.stringify(update.before) === JSON.stringify(update.after)) continue;
		entry.style.visualization = structuredClone(update.after);
	}
};
