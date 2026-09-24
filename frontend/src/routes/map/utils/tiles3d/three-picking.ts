import type { FeatureProp } from '$routes/map/types/properties';
import type { BatchTable } from '3d-tiles-renderer/core';
import type { StructuralMetadata } from '3d-tiles-renderer/three/plugins';
import { InstancedMesh, type Intersection, Mesh, Object3D, Triangle, Vector3 } from 'three';

export interface PickedTiles3DFeature {
	entryId: string;
	featureId: string;
	properties: FeatureProp;
}

export type FeatureDefinition = {
	attribute?: number;
	propertyTable?: number;
	nullFeatureId?: number;
	featureCount?: number;
	texture?: unknown;
};
const featureDefinitions = new WeakMap<Object3D, FeatureDefinition[]>();
export const setTilesFeatureDefinitions = (object: Object3D, definitions: FeatureDefinition[]) => {
	featureDefinitions.set(object, definitions);
};

const displayValue = (value: unknown): string | number | boolean => {
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}
	if (typeof value === 'bigint') return value.toString();
	return JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item)
		?? '';
};

export const resolveTilesIntersection = (
	hit: Intersection,
	entryId: string
): PickedTiles3DFeature | null => {
	const object = hit.object;
	if (!(object instanceof Mesh) || !hit.face || hit.faceIndex === undefined) return null;
	const geometry = object.geometry;
	const face = hit.face;
	const localPoint = object.worldToLocal(hit.point.clone());
	const triangle = new Triangle().setFromAttributeAndIndices(
		geometry.getAttribute('position'),
		face.a,
		face.b,
		face.c
	);
	const barycentric = triangle.getBarycoord(localPoint, new Vector3()) ?? new Vector3(1, 0, 0);
	const weights = barycentric.toArray();
	const vertex = [face.a, face.b, face.c][weights.indexOf(Math.max(...weights))];
	// 属性IDの取得だけで補助WebGLコンテキストを生成しない。テクスチャIDは従来どおり対象外。
	const features = featureDefinitions.get(object);
	const definition = features?.find((item) => !item.texture && item.propertyTable !== undefined)
		?? features?.find((item) => !item.texture);
	const attribute = definition
		? (definition.attribute === undefined
			? undefined
			: geometry.getAttribute(`_feature_id_${definition.attribute}`))
		: geometry.getAttribute('_batchid') ?? geometry.getAttribute('batchid');
	let id = definition && definition.attribute === undefined ? vertex : attribute?.getX(vertex);
	if (
		object instanceof InstancedMesh || id === definition?.nullFeatureId
		|| !Number.isSafeInteger(id) || (id ?? -1) < 0
		|| (definition?.featureCount !== undefined && id! >= definition.featureCount)
	) id = undefined;
	let properties: FeatureProp = {};
	if (id !== undefined) {
		try {
			let values: object | undefined;
			if (definition?.propertyTable !== undefined) {
				const metadata = object.userData.structuralMetadata as
					| StructuralMetadata
					| undefined;
				values = metadata?.getPropertyTableData([definition.propertyTable], [id], [])[0];
			} else {
				let ancestor: Object3D | null = object;
				while (ancestor) {
					const table = (ancestor as Object3D & { batchTable?: BatchTable; }).batchTable;
					if (table) {
						if (id < table.count) values = table.getDataFromId(id);
						break;
					}
					ancestor = ancestor.parent;
				}
			}
			properties = Object.fromEntries(
				Object.entries(values ?? {}).map(([key, value]) => [key, displayValue(value)])
			);
		} catch {
			properties = { 属性情報: '属性を読み取れません（未対応の形式または不正なデータ）' };
		}
	}
	return {
		entryId,
		featureId: `${object.uuid}:${definition?.propertyTable ?? 'batch'}:${id ?? 'unknown'}`,
		properties: {
			...(id === undefined ? {} : { 地物ID: id }),
			...(Object.keys(properties).length ? properties : {
				属性情報: id === undefined
					? 'このタイルの地物IDを取得できません（IDなし、または未対応の形式）'
					: 'この地物には読み取り可能な属性がありません'
			})
		}
	};
};
