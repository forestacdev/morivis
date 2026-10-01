import { getIfcAttributes, type ModelAttributes } from '$routes/map/utils/three/model-attributes';
import * as THREE from 'three';

export const getIfcExpressId = (
	model: THREE.Object3D,
	hit: THREE.Intersection<THREE.Object3D>
): number | undefined => {
	const ifcModel = model as THREE.Object3D & {
		ifcManager?: {
			getExpressId: (geometry: THREE.BufferGeometry, faceIndex: number) => number;
		} | null;
	};
	const mesh = hit.object as THREE.Mesh;
	if (!ifcModel.ifcManager || !mesh.geometry || hit.faceIndex == null) return undefined;
	return ifcModel.ifcManager.getExpressId(mesh.geometry, hit.faceIndex);
};

export const resolveIfcAttributes = async (
	model: THREE.Object3D,
	hit: THREE.Intersection<THREE.Object3D>
): Promise<ModelAttributes> => {
	const ifcModel = model as THREE.Object3D & {
		modelID?: number;
		ifcManager?: {
			getItemProperties: (
				modelId: number,
				expressId: number
			) => Promise<Record<string, unknown>>;
			getPropertySets: (
				modelId: number,
				expressId: number,
				recursive?: boolean
			) => Promise<Record<string, unknown>[]>;
			getTypeProperties: (
				modelId: number,
				expressId: number,
				recursive?: boolean
			) => Promise<Record<string, unknown>[]>;
			getIfcType: (modelId: number, expressId: number) => string | Promise<string>;
		} | null;
	};
	const expressId = getIfcExpressId(model, hit);
	if (ifcModel.modelID == null || expressId == null || !ifcModel.ifcManager) return {};
	const cachedAttributes = (
		model.userData.morivisIfcPartAttributes as Map<number, ModelAttributes> | undefined
	)?.get(expressId);
	const [itemResult, propertySetsResult, typePropertiesResult, ifcTypeResult] = await Promise
		.allSettled([
			ifcModel.ifcManager.getItemProperties(ifcModel.modelID, expressId),
			ifcModel.ifcManager.getPropertySets(ifcModel.modelID, expressId, true),
			ifcModel.ifcManager.getTypeProperties(ifcModel.modelID, expressId, true),
			ifcModel.ifcManager.getIfcType(ifcModel.modelID, expressId)
		]);
	const item = itemResult.status === 'fulfilled' ? itemResult.value : {};
	const propertySets = propertySetsResult.status === 'fulfilled'
		? propertySetsResult.value
		: [];
	const typeProperties = typePropertiesResult.status === 'fulfilled'
		? typePropertiesResult.value
		: [];
	const ifcType = ifcTypeResult.status === 'fulfilled' ? ifcTypeResult.value : undefined;
	if (!import.meta.env.PROD) {
		const failed = [itemResult, propertySetsResult, typePropertiesResult, ifcTypeResult]
			.filter(
				(result) => result.status === 'rejected'
			);
		if (failed.length > 0) {
			console.warn('[IFC属性] 一部の属性取得に失敗しました', {
				expressId,
				failedCount: failed.length,
				errors: failed.map((result) => String((result as PromiseRejectedResult).reason))
			});
		}
	}
	return {
		...cachedAttributes,
		...getIfcAttributes(expressId, item, [...propertySets, ...typeProperties]),
		...(ifcType ? { 'IFC クラス': ifcType } : {})
	};
};
