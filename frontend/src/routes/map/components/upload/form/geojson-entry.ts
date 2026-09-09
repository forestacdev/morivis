import { createGeoJson3DEntry } from '$routes/map/data/entries/model';
import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import type { VectorStyle } from '$routes/map/data/types/vector/style';
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry, GeometryCollection } from '$routes/map/types/geometry';
import {
	canRender3dGeoJsonWithDeck,
	has3dGeometryForType
} from '$routes/map/utils/formats/geojson/3d';

/** 2D（MapLibreベクター）か3D（deck.gl）のどちらで描画するか。 */
export type GeoJsonRenderMode = 'geojson' | 'deck';

const to2dPosition = (position: number[]): [number, number] => [position[0], position[1]];

const stripGeometryZ = (
	geometry: AnyGeometry | GeometryCollection
): AnyGeometry | GeometryCollection => {
	if (geometry.type === 'Point') {
		return {
			...geometry,
			coordinates: to2dPosition(geometry.coordinates as unknown as number[])
		};
	}

	if (geometry.type === 'MultiPoint' || geometry.type === 'LineString') {
		return {
			...geometry,
			coordinates: geometry.coordinates.map((position) =>
				to2dPosition(position as unknown as number[])
			)
		};
	}

	if (geometry.type === 'MultiLineString' || geometry.type === 'Polygon') {
		return {
			...geometry,
			coordinates: geometry.coordinates.map((line) =>
				line.map((position) => to2dPosition(position as unknown as number[]))
			)
		};
	}

	if (geometry.type === 'MultiPolygon') {
		return {
			...geometry,
			coordinates: geometry.coordinates.map((polygon) =>
				polygon.map((line) => line.map((position) => to2dPosition(position as unknown as number[])))
			)
		};
	}

	return {
		type: 'GeometryCollection',
		geometries: geometry.geometries.map((child) => stripGeometryZ(child))
	} as unknown as GeometryCollection;
};

export const stripGeojsonZ = (geojson: FeatureCollection): FeatureCollection =>
	({
		...geojson,
		features: geojson.features.map((feature) => ({
			...feature,
			geometry: stripGeometryZ(feature.geometry as unknown as AnyGeometry | GeometryCollection)
		}))
	}) as unknown as FeatureCollection;

/**
 * 3D（deck.gl）で描画できるデータかを判定する。
 * 描画方式の選択UIを出すかどうかの判断にも使う。
 */
export const canRenderGeoJsonAs3d = (
	geojson: FeatureCollection,
	geometryType: VectorEntryGeometryType
): boolean =>
	canRender3dGeoJsonWithDeck(geometryType) && has3dGeometryForType(geojson, geometryType);

/**
 * 描画方式を解決する。
 * 3D描画できないデータに 'deck' を指定した場合は 'geojson' に落とす。
 */
export const resolveGeoJsonRenderMode = (
	geojson: FeatureCollection,
	geometryType: VectorEntryGeometryType,
	requestedMode: GeoJsonRenderMode
): GeoJsonRenderMode =>
	requestedMode === 'deck' && canRenderGeoJsonAs3d(geojson, geometryType) ? 'deck' : 'geojson';

/**
 * 描画方式を明示して entry を生成する。
 * 'deck' でも3D描画できないデータは自動的に2Dベクターになる。
 */
export const createGeoJsonEntryWithMode = async ({
	geojson,
	geometryType,
	name,
	bbox,
	style,
	attribution,
	defaultColor,
	renderMode
}: {
	geojson: FeatureCollection;
	geometryType: VectorEntryGeometryType;
	name: string;
	bbox: [number, number, number, number];
	style?: VectorStyle;
	attribution: string;
	defaultColor?: string;
	renderMode: GeoJsonRenderMode;
}): Promise<MorivisLayerEntry | undefined> => {
	if (resolveGeoJsonRenderMode(geojson, geometryType, renderMode) === 'deck') {
		const entry = createGeoJson3DEntry(name, geojson, geometryType, bbox);

		return {
			...entry,
			metaData: {
				...entry.metaData,
				attribution
			}
		};
	}

	return createGeoJsonEntry(stripGeojsonZ(geojson), geometryType, name, bbox, style, {
		attribution,
		defaultColor
	});
};

/**
 * Z座標があれば自動的に3D entry を生成する。
 * 描画方式をユーザーに選ばせないフォーム（DXF/DWG/SXF等）向け。
 */
export const createAutoGeoJsonEntry = async ({
	geojson,
	geometryType,
	name,
	bbox,
	style,
	attribution,
	defaultColor,
	allow3d = true
}: {
	geojson: FeatureCollection;
	geometryType: VectorEntryGeometryType;
	name: string;
	bbox: [number, number, number, number];
	style?: VectorStyle;
	attribution: string;
	defaultColor?: string;
	allow3d?: boolean;
}): Promise<MorivisLayerEntry | undefined> =>
	createGeoJsonEntryWithMode({
		geojson,
		geometryType,
		name,
		bbox,
		style,
		attribution,
		defaultColor,
		renderMode: allow3d ? 'deck' : 'geojson'
	});
