/**
 * TopoJSON パーサー
 *
 * - TopoJSON仕様: https://github.com/topojson/topojson-specification
 * - topojson-client: https://github.com/topojson/topojson-client
 */

import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { FeatureProp } from '$routes/map/types/properties';
import type { AnyGeometry } from '$routes/map/types/geometry';

/** TopoJSONに含まれるオブジェクト名の一覧を取得 */
export const getTopoJsonObjectNames = (topology: Topology): string[] =>
	Object.keys(topology.objects);

/** TopoJSONの特定オブジェクトをGeoJSON FeatureCollectionに変換 */
export const topoJsonObjectToGeoJson = (
	topology: Topology,
	objectName: string
): FeatureCollection => {
	const obj = topology.objects[objectName] as GeometryCollection;
	const fc = feature(topology, obj);
	return fc as unknown as FeatureCollection<AnyGeometry, FeatureProp>;
};

/**
 * TopoJSONファイルをパースしてGeoJSONに変換する
 * オブジェクトが1つなら自動変換、複数ならobjectNameで指定
 */
export const topoJsonFileToGeoJson = async (
	file: File,
	objectName?: string
): Promise<FeatureCollection> => {
	try {
		const text = await file.text();
		const topology: Topology = JSON.parse(text);

		if (topology.type !== 'Topology' || !topology.objects) {
			throw new Error('Invalid TopoJSON structure');
		}

		const names = getTopoJsonObjectNames(topology);
		if (names.length === 0) {
			throw new Error('No objects found in TopoJSON');
		}

		const targetName = objectName ?? names[0];
		return topoJsonObjectToGeoJson(topology, targetName);
	} catch (error) {
		console.error('TopoJSON parsing error:', error);
		throw new Error('Failed to parse TopoJSON file');
	}
};

/** TopoJSONファイルからオブジェクト名一覧を取得 */
export const getTopoJsonObjects = async (
	file: File
): Promise<{ name: string; count: number }[]> => {
	const text = await file.text();
	const topology: Topology = JSON.parse(text);

	return Object.entries(topology.objects).map(([name, obj]) => ({
		name,
		count: (obj as GeometryCollection).geometries?.length ?? 0
	}));
};
