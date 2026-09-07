import type { MorivisLayerEntry } from '$routes/map/data/types';

interface SinglePointFocus {
	center: [number, number];
	zoom: 14;
}

/** Point entryの範囲が一点に縮退している場合、過剰ズームを防ぐフォーカス設定を返す。 */
export const getSinglePointFocus = (entry: MorivisLayerEntry): SinglePointFocus | null => {
	if (entry.type !== 'vector' || entry.format.geometryType !== 'Point') return null;

	const [west, south, east, north] = entry.metaData.bounds;
	if (![west, south, east, north].every(Number.isFinite)) return null;
	if (west !== east || south !== north) return null;

	return {
		center: entry.metaData.center ?? [west, south],
		zoom: 14
	};
};
