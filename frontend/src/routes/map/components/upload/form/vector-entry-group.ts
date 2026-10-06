import { filterByGeometryType } from '$routes/map/data/entries/vector';
import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import type { VectorStyle } from '$routes/map/data/types/vector/style';
import type { FeatureCollection } from '$routes/map/types/geojson';
import turfBbox from '@turf/bbox';
import { createAutoGeoJsonEntry } from './geojson-entry';

export interface VectorEntryGroup {
	geometryType: VectorEntryGeometryType;
	name: string;
	style?: VectorStyle;
	attribution: string;
	colorProperty?: string;
	allow3d: boolean;
}

// 座標変換・四隅変形は全図形へ一度適用し、その結果を描画単位へ分ける。
export const createVectorEntryGroup = async (
	geojson: FeatureCollection,
	groups: VectorEntryGroup[]
): Promise<MorivisLayerEntry[]> => {
	const entries: MorivisLayerEntry[] = [];
	for (const group of groups) {
		const part = filterByGeometryType(geojson, group.geometryType);
		if (!part.features.length) continue;
		const entry = await createAutoGeoJsonEntry({
			...group,
			geojson: part,
			bbox: turfBbox(part) as [number, number, number, number]
		});
		if (!entry) throw new Error(`${group.name}のレイヤーを作成できませんでした。`);
		entries.push(entry);
	}
	if (!entries.length) throw new Error('読み込める図形がありません。');
	return entries;
};
