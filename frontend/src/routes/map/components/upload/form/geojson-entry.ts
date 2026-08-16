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
				polygon.map((line) =>
					line.map((position) => to2dPosition(position as unknown as number[]))
				)
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
			geometry: stripGeometryZ(
				feature.geometry as unknown as AnyGeometry | GeometryCollection
			)
		}))
	}) as unknown as FeatureCollection;

export const createAutoGeoJsonEntry = async ({
	geojson,
	geometryType,
	name,
	bbox,
	style,
	attribution
}: {
	geojson: FeatureCollection;
	geometryType: VectorEntryGeometryType;
	name: string;
	bbox: [number, number, number, number];
	style?: VectorStyle;
	attribution: string;
}): Promise<MorivisLayerEntry | undefined> => {
	if (canRender3dGeoJsonWithDeck(geometryType) && has3dGeometryForType(geojson, geometryType)) {
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
		attribution
	});
};
