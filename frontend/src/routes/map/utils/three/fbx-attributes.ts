import * as THREE from 'three';

export type FbxAttributeValue = string | number | boolean | Array<string | number | boolean>;
export type FbxModelAttributes = Record<string, FbxAttributeValue>;

export interface ResolvedFbxModelAttributes {
	object: THREE.Object3D;
	attributes?: FbxModelAttributes;
}

const BINARY_HEADER_PREFIX = 'Kaydara FBX Binary  ';
const DEFAULT_FBX_EULER_ORDER = 'ZYX';
const IDENTITY_SCALE = new THREE.Vector3(1, 1, 1);
const ZERO_VECTOR = new THREE.Vector3();
const CIVIL3D_SEGMENT_ATTRIBUTE_PATTERN = /^Civil3D - Segment \d+ Data\b/i;
const CIVIL3D_OMITTED_SEGMENT_COUNT_KEY = 'Civil3D - Segment Data:省略属性数';

const getFbxVector3 = (value: FbxAttributeValue | undefined) => {
	const values = Array.isArray(value)
		? value
		: typeof value === 'string'
		? value.split(',')
		: [value];
	if (values.length < 3) return undefined;

	const vector = values.slice(0, 3).map((item) => Number(item));
	return vector.every(Number.isFinite)
		? new THREE.Vector3(vector[0], vector[1], vector[2])
		: undefined;
};

const getFbxEulerOrder = (value: FbxAttributeValue | undefined): THREE.EulerOrder => {
	const order = Number(Array.isArray(value) ? value[0] : value);
	const orders: THREE.EulerOrder[] = ['ZYX', 'YZX', 'XZY', 'ZXY', 'YXZ', 'XYZ'];
	return Number.isInteger(order) && order >= 0 && order < orders.length
		? orders[order]
		: DEFAULT_FBX_EULER_ORDER;
};

export const getFbxGeometricTransform = (attributes: FbxModelAttributes | undefined) => {
	const translation = getFbxVector3(attributes?.GeometricTranslation) ?? ZERO_VECTOR;
	const rotation = getFbxVector3(attributes?.GeometricRotation) ?? ZERO_VECTOR;
	const scaling = getFbxVector3(attributes?.GeometricScaling) ?? IDENTITY_SCALE;
	if (
		translation.equals(ZERO_VECTOR) && rotation.equals(ZERO_VECTOR)
		&& scaling.equals(IDENTITY_SCALE)
	) {
		return undefined;
	}

	const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
		new THREE.Euler(
			THREE.MathUtils.degToRad(rotation.x),
			THREE.MathUtils.degToRad(rotation.y),
			THREE.MathUtils.degToRad(rotation.z),
			getFbxEulerOrder(attributes?.RotationOrder)
		)
	);
	return new THREE.Matrix4()
		.makeTranslation(translation.x, translation.y, translation.z)
		.multiply(rotationMatrix)
		.scale(scaling);
};

export const applyFbxCurveGeometricTransform = (
	object: THREE.Object3D,
	attributesByModelId: Record<string, FbxModelAttributes>
) => {
	// FBXLoader はNurbsCurveのマテリアルを取得できず、全曲線を固定色 #3300ff で生成する。
	// この青線はmorivisのエッジではなく、CADの線分や文字輪郭を含むFBX由来の曲線要素。
	// またMeshとは異なりGeometricTransformも適用されないため、ここで両方を識別・補正する。
	const geometryUseCounts = new Map<THREE.BufferGeometry, number>();
	object.traverse((child) => {
		if (!(child as THREE.Line).isLine) return;
		child.userData.morivisFbxCurve = true;
		const geometry = (child as THREE.Line).geometry;
		geometryUseCounts.set(geometry, (geometryUseCounts.get(geometry) ?? 0) + 1);
	});

	let appliedCount = 0;
	object.traverse((child) => {
		if (!(child as THREE.Line).isLine || child.userData.morivisFbxGeometricTransformApplied) {
			return;
		}
		const modelId = (child as THREE.Object3D & { ID?: number; }).ID;
		if (modelId == null) return;
		const transform = getFbxGeometricTransform(attributesByModelId[String(modelId)]);
		if (!transform) return;

		const line = child as THREE.Line;
		const geometry = line.geometry;
		// 同じ曲線ジオメトリを複数の Model が共有する場合、Model ごとの変換を分離する。
		const transformedGeometry = (geometryUseCounts.get(geometry) ?? 0) > 1
			? geometry.clone()
			: geometry;
		transformedGeometry.applyMatrix4(transform);
		transformedGeometry.computeBoundingBox();
		transformedGeometry.computeBoundingSphere();
		line.geometry = transformedGeometry;
		line.userData.morivisFbxGeometricTransformApplied = true;
		appliedCount += 1;
	});

	return appliedCount;
};

export const setFbxCurveVisibility = (object: THREE.Object3D, visible: boolean) => {
	object.traverse((child) => {
		if (child.userData.morivisFbxCurve === true) {
			child.visible = visible;
		}
	});
};

/**
 * 選択ノードから親方向へFBX属性を合成する。
 *
 * Civil 3D由来のFBXでは、描画される `curve N` Modelには管理属性しかなく、
 * Alignment/Profile本体のCivil3D属性や画層は親Modelに付く。子側を優先しつつ
 * 親属性を継承しないと、曲線を選択したときに測点範囲などが欠落する。
 */
export const resolveFbxModelAttributes = (
	object: THREE.Object3D,
	root?: THREE.Object3D
): ResolvedFbxModelAttributes => {
	const attributes: FbxModelAttributes = {};
	let omittedCivil3dSegmentCount = 0;
	let attributeObject = object;
	let hasAttributes = false;
	let current: THREE.Object3D | null = object;
	while (current) {
		const currentAttributes = current.userData.morivisFbxAttributes as
			| FbxModelAttributes
			| undefined;
		if (currentAttributes) {
			if (!hasAttributes) attributeObject = current;
			Object.entries(currentAttributes).forEach(([key, value]) => {
				// Alignmentには数千区間分の同型属性が付くことがある。全件をDOMへ渡すと
				// 属性パネルが実用にならないため、概要・Geometry・Sub-entityは残し、
				// 反復するSegment属性だけを件数へ畳む。生属性は各ノードのuserDataに残る。
				if (CIVIL3D_SEGMENT_ATTRIBUTE_PATTERN.test(key)) {
					omittedCivil3dSegmentCount += 1;
					return;
				}
				if (!(key in attributes)) attributes[key] = value;
			});
			hasAttributes = true;
		}
		if (current === root) break;
		current = current.parent;
	}
	if (omittedCivil3dSegmentCount > 0) {
		attributes[CIVIL3D_OMITTED_SEGMENT_COUNT_KEY] = omittedCivil3dSegmentCount;
	}

	return {
		object: attributeObject,
		attributes: hasAttributes ? attributes : undefined
	};
};

export const parseFbxModelAttributes = (
	buffer: ArrayBuffer
): Record<string, FbxModelAttributes> => {
	const bytes = new Uint8Array(buffer);
	if (
		new TextDecoder().decode(bytes.subarray(0, BINARY_HEADER_PREFIX.length))
			!== BINARY_HEADER_PREFIX
	) {
		return {};
	}
	const view = new DataView(buffer);
	const decoder = new TextDecoder();
	const version = view.getUint32(23, true);
	const nodeHeaderLength = version >= 7500 ? 25 : 13;
	const getString = (offset: number, length: number) =>
		decoder.decode(bytes.subarray(offset, offset + length));
	const hasBytes = (offset: number, length: number, limit: number) =>
		Number.isSafeInteger(offset)
		&& Number.isSafeInteger(length)
		&& offset >= 0
		&& length >= 0
		&& offset + length <= limit
		&& offset + length <= buffer.byteLength;
	const readProperty = (offset: number, limit: number): [FbxAttributeValue | null, number] => {
		if (!hasBytes(offset, 1, limit)) return [null, limit];
		const type = String.fromCharCode(view.getUint8(offset));
		offset += 1;
		if (type === 'C' && hasBytes(offset, 1, limit)) {
			return [view.getUint8(offset) !== 0, offset + 1];
		}
		if (type === 'I' && hasBytes(offset, 4, limit)) {
			return [view.getInt32(offset, true), offset + 4];
		}
		if (type === 'F' && hasBytes(offset, 4, limit)) {
			return [view.getFloat32(offset, true), offset + 4];
		}
		if (type === 'D' && hasBytes(offset, 8, limit)) {
			return [view.getFloat64(offset, true), offset + 8];
		}
		if (type === 'L' && hasBytes(offset, 8, limit)) {
			return [Number(view.getBigInt64(offset, true)), offset + 8];
		}
		if (type === 'S') {
			if (!hasBytes(offset, 4, limit)) return [null, limit];
			const length = view.getUint32(offset, true);
			if (!hasBytes(offset + 4, length, limit)) return [null, limit];
			return [getString(offset + 4, length), offset + 4 + length];
		}
		if ('fdilb'.includes(type)) {
			if (!hasBytes(offset, 12, limit)) return [null, limit];
			const length = view.getUint32(offset + 8, true);
			return hasBytes(offset + 12, length, limit)
				? [null, offset + 12 + length]
				: [null, limit];
		}
		if (type === 'Y' && hasBytes(offset, 2, limit)) {
			return [view.getInt16(offset, true), offset + 2];
		}
		return [null, limit];
	};
	const attributes: Record<string, FbxModelAttributes> = {};
	const parseNode = (offset: number, modelId?: string): number => {
		if (!hasBytes(offset, nodeHeaderLength, buffer.byteLength)) return buffer.byteLength;
		const end = version >= 7500
			? Number(view.getBigUint64(offset, true))
			: view.getUint32(offset, true);
		if (end === 0) return offset + nodeHeaderLength;
		if (end <= offset || end > buffer.byteLength) return buffer.byteLength;
		const propertyLength = version >= 7500
			? Number(view.getBigUint64(offset + 16, true))
			: view.getUint32(offset + 8, true);
		const nameLength = view.getUint8(offset + nodeHeaderLength - 1);
		const nameOffset = offset + nodeHeaderLength;
		if (!hasBytes(nameOffset, nameLength, end)) return end;
		const name = getString(nameOffset, nameLength);
		let cursor = nameOffset + nameLength;
		const propertyEnd = cursor + propertyLength;
		if (!Number.isSafeInteger(propertyEnd) || propertyEnd > end) return end;
		const values: (FbxAttributeValue | null)[] = [];
		while (cursor < propertyEnd) {
			const [value, next] = readProperty(cursor, propertyEnd);
			values.push(value);
			if (next <= cursor) return end;
			cursor = next;
		}
		const currentModelId = name === 'Model' && values[0] != null ? String(values[0]) : modelId;
		if (name === 'P' && currentModelId && typeof values[0] === 'string') {
			const propertyValues = values.slice(4).filter((item): item is FbxAttributeValue =>
				item != null
			);
			const value = propertyValues.length === 1
				? propertyValues[0]
				: propertyValues.map(String).join(', ');
			if (value !== '') (attributes[currentModelId] ??= {})[values[0]] = value;
		}
		while (cursor + nodeHeaderLength <= end) {
			const nextOffset = parseNode(cursor, currentModelId);
			if (nextOffset <= cursor) break;
			cursor = nextOffset;
		}
		return end;
	};
	let offset = 27;
	while (offset + nodeHeaderLength <= buffer.byteLength) {
		const nextOffset = parseNode(offset);
		if (nextOffset <= offset) break;
		offset = nextOffset;
	}
	return attributes;
};
