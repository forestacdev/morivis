import {
	buildDxfStyle,
	filterByGeometryType,
	getGeometryTypes
} from '$routes/map/data/entries/vector';
import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import type { FeatureCollection } from '$routes/map/types/geojson';
import { prepareDxfVectorData } from '$routes/map/utils/formats/dxf/planar';
import type { VectorEntryGroup } from './vector-entry-group';

export type CadRenderMode = '2d' | '3d' | '2d-line';

export const CAD_GEOMETRY_LABELS: Record<VectorEntryGeometryType, string> = {
	Point: 'ポイント',
	LineString: 'ライン',
	Polygon: 'ポリゴン'
};

export const prepareCadVectorData = (
	input: FeatureCollection,
	selectedTypes: VectorEntryGeometryType[],
	mode: CadRenderMode,
	name: string,
	attribution: string
) => {
	const geojson: FeatureCollection = { type: 'FeatureCollection', features: [] };
	for (const type of selectedTypes) {
		const part = filterByGeometryType(input, type);
		if (!part.features.length) continue;
		geojson.features.push(
			...prepareDxfVectorData(part, type, mode === '3d' ? 'auto' : mode).geojson.features
		);
	}
	const types = getGeometryTypes(geojson);
	const groups: VectorEntryGroup[] = types.map(geometryType => {
		const part = filterByGeometryType(geojson, geometryType);
		return {
			geometryType,
			name: types.length > 1 ? `${name}／${CAD_GEOMETRY_LABELS[geometryType]}` : name,
			style: buildDxfStyle(
				part,
				geometryType,
				Object.keys(part.features[0]?.properties ?? {})
			),
			attribution,
			colorProperty: 'color',
			allow3d: mode === '3d'
		};
	});
	if (!groups.length) throw new Error('読み込める図形がありません。');
	return { geojson, groups };
};
