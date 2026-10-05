import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import { type DxfParseResult, type DxfUnit, parseDxf } from '../dxf';
import {
	type IndexedCadMesh,
	indexedCadMeshToFeature,
	scaleIndexedCadMesh
} from '../dxf/indexed-mesh';
import {
	decodeDwgWithSolids,
	type DwgReadOptions,
	type DwgSolidDescriptor,
	type SkippedDwgSolid
} from './acis';

export interface DwgParseResult extends DxfParseResult {
	skippedSolids: SkippedDwgSolid[];
}
export interface DwgDrawingResult extends DwgParseResult {
	solids: IndexedCadMesh[];
	solidDescriptors: DwgSolidDescriptor[];
}

/** UIと3Dモデル変換では、ソリッドを頂点共有のバイナリとして保持する。 */
export const analyzeDwgDrawing = async (
	arrayBuffer: ArrayBuffer,
	unit: DxfUnit = 'auto',
	options?: DwgReadOptions
): Promise<DwgDrawingResult> => {
	const drawing = await decodeDwgWithSolids(arrayBuffer, options);
	const result = parseDxf(drawing.dxf, unit);
	for (const solid of drawing.solids) scaleIndexedCadMesh(solid, result.metersPerUnit);
	return {
		...result,
		solidDescriptors: drawing.solidDescriptors,
		solids: drawing.solids,
		skippedSolids: drawing.skippedSolids
	};
};

/** GeoJSONを要求する既存APIだけ、面ごとの座標配列へ展開する。 */
export const analyzeDwgArrayBuffer = async (
	arrayBuffer: ArrayBuffer,
	unit: DxfUnit = 'auto'
): Promise<DwgParseResult> => {
	const { solids, ...result } = await analyzeDwgDrawing(arrayBuffer, unit);
	for (const solid of solids) {
		result.geojson.features.push(indexedCadMeshToFeature(solid) as unknown as Feature);
	}
	return result;
};
export const dwgArrayBufferToGeoJson = async (
	arrayBuffer: ArrayBuffer
): Promise<FeatureCollection> => (await analyzeDwgArrayBuffer(arrayBuffer)).geojson;
export const dwgFileToGeoJsonBrowser = async (file: File): Promise<FeatureCollection> =>
	dwgArrayBufferToGeoJson(await file.arrayBuffer());
