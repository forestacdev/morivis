import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import type { MorivisLayerEntry } from '$routes/map/data/types';

/** 「世界」の分類でも、対象範囲が世界全体より狭ければフォーカスできる。 */
export const canFocusLayer = (entry: Pick<MorivisLayerEntry, 'metaData'>): boolean => {
	const { location, bounds } = entry.metaData;
	if (location === '全国') return false;
	if (location !== '世界') return true;

	const [west, south, east, north] = bounds;
	if (![west, south, east, north].every(Number.isFinite) || south > north) return false;
	const [worldWest, worldSouth, worldEast, worldNorth] = WEB_MERCATOR_WORLD_BBOX;
	// Web Mercatorの最大緯度を小数6桁などで保存した場合の丸め差を許容する。
	const epsilon = 1e-6;
	return east - west < worldEast - worldWest - epsilon
		|| south > worldSouth + epsilon
		|| north < worldNorth - epsilon;
};

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
