import * as THREE from 'three';

export type ModelAttributeValue = string | number | boolean;
export type ModelAttributes = Record<string, ModelAttributeValue>;

const toAttributeValue = (value: unknown): ModelAttributeValue | undefined => {
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}
	if (
		Array.isArray(value)
		&& value.every(
			(item) =>
				typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
		)
	) {
		return value.join(', ');
	}
	return undefined;
};

const getUserDataAttributes = (object: THREE.Object3D): ModelAttributes => {
	const attributes: ModelAttributes = {};
	let current: THREE.Object3D | null = object;
	while (current) {
		Object.entries(current.userData).forEach(([key, value]) => {
			if (key === 'entryId' || key === 'originalName' || key.startsWith('morivis')) return;
			const attributeValue = toAttributeValue(value);
			if (attributeValue !== undefined && !(key in attributes)) attributes[key] = attributeValue;
		});
		current = current.parent;
	}
	return attributes;
};

/** 形式を問わず Three.js ノード、geometry、material に付随する識別情報を返す。 */
export const getModelObjectAttributes = (object: THREE.Object3D): ModelAttributes => {
	const attributes: ModelAttributes = {
		...getUserDataAttributes(object),
		ノードID: object.uuid
	};
	const mesh = object as THREE.Mesh;
	if (mesh.geometry) attributes['ジオメトリID'] = mesh.geometry.uuid;
	const material = mesh.material;
	const firstMaterial = Array.isArray(material) ? material[0] : material;
	if (firstMaterial) {
		attributes['マテリアルID'] = firstMaterial.uuid;
		if (firstMaterial.name) attributes['マテリアル名'] = firstMaterial.name;
	}
	return attributes;
};

const unwrapIfcValue = (value: unknown): ModelAttributeValue | undefined => {
	const directValue = toAttributeValue(value);
	if (directValue !== undefined) return directValue;
	if (value && typeof value === 'object' && 'value' in value) {
		return toAttributeValue(value.value);
	}
	return undefined;
};

const getIfcName = (propertySet: Record<string, unknown>) =>
	unwrapIfcValue(propertySet.Name) ?? `PropertySet #${propertySet.expressID ?? ''}`;

/** IFC.js の要素情報と property set を属性パネル向けの平坦な値に変換する。 */
export const getIfcAttributes = (
	expressId: number,
	item: Record<string, unknown>,
	propertySets: Record<string, unknown>[]
): ModelAttributes => {
	const attributes: ModelAttributes = { 'IFC Express ID': expressId };
	Object.entries(item).forEach(([key, value]) => {
		if (key === 'expressID' || key === 'type') return;
		const attributeValue = unwrapIfcValue(value);
		if (attributeValue !== undefined) attributes[key] = attributeValue;
	});
	if (typeof item.type === 'string') attributes['IFC クラス'] = item.type;
	propertySets.forEach((propertySet) => {
		const propertySetName = getIfcName(propertySet);
		const properties = propertySet.HasProperties ?? propertySet.Quantities;
		if (!Array.isArray(properties)) return;
		properties.forEach((property) => {
			if (!property || typeof property !== 'object') return;
			const typedProperty = property as Record<string, unknown>;
			const name = unwrapIfcValue(typedProperty.Name);
			const value = unwrapIfcValue(typedProperty.NominalValue)
				?? unwrapIfcValue(typedProperty.ListValues)
				?? unwrapIfcValue(typedProperty.LengthValue)
				?? unwrapIfcValue(typedProperty.AreaValue)
				?? unwrapIfcValue(typedProperty.VolumeValue)
				?? unwrapIfcValue(typedProperty.CountValue)
				?? unwrapIfcValue(typedProperty.WeightValue)
				?? unwrapIfcValue(typedProperty.TimeValue);
			if (name !== undefined && value !== undefined) {
				attributes[`${propertySetName}.${name}`] = value;
			}
		});
	});
	return attributes;
};
