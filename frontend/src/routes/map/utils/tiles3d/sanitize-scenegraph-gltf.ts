type TypedArrayLike =
	| Int8Array
	| Uint8Array
	| Uint8ClampedArray
	| Int16Array
	| Uint16Array
	| Int32Array
	| Uint32Array
	| Float32Array
	| Float64Array;

type GltfAccessorLike = {
	componentType?: number;
	components?: number;
	count?: number;
	max?: number[];
	min?: number[];
	normalized?: boolean;
	type?: string;
	value?: ArrayBufferView | TypedArrayLike;
};

type GltfPrimitiveLike = {
	attributes?: Record<string, GltfAccessorLike>;
	indices?: GltfAccessorLike;
};

type GltfMeshLike = {
	primitives?: GltfPrimitiveLike[];
};

export type ScenegraphGltfLike = {
	accessors?: GltfAccessorLike[];
	meshes?: GltfMeshLike[];
};

// FME 製 b3dm 互換用の一時回避。
// deck.gl / luma.gl 側が独自属性や Uint8 インデックスをそのまま扱えるようになったら
// 見直しまたは削除候補。
const GLTF_RENDER_ATTRIBUTE_NAMES = new Set(['POSITION', 'NORMAL', 'TANGENT']);
const GLTF_RENDER_ATTRIBUTE_PREFIXES = ['TEXCOORD_', 'COLOR_', 'JOINTS_', 'WEIGHTS_'];
const GLTF_UNSIGNED_SHORT = 5123;
const GLTF_UNSIGNED_INT = 5125;
const UINT16_INDEX_LIMIT = 65535;

const isScenegraphRenderAttribute = (name: string): boolean =>
	GLTF_RENDER_ATTRIBUTE_NAMES.has(name)
	|| GLTF_RENDER_ATTRIBUTE_PREFIXES.some((prefix) => name.startsWith(prefix));

const isTypedArrayLike = (value: ArrayBufferView | undefined): value is TypedArrayLike =>
	Boolean(value) && !(value instanceof DataView);

const toSupportedScenegraphIndexArray = (
	value: ArrayBufferView | undefined
): Uint16Array | Uint32Array | null => {
	if (!isTypedArrayLike(value)) {
		return null;
	}

	if (value instanceof Uint16Array || value instanceof Uint32Array) {
		return value;
	}

	const values = Array.from(value);
	if (values.some((index) => !Number.isInteger(index) || index < 0)) {
		return null;
	}

	const maxIndex = values.reduce((max, index) => Math.max(max, index), 0);

	return maxIndex > UINT16_INDEX_LIMIT ? Uint32Array.from(values) : Uint16Array.from(values);
};

const normalizePrimitiveIndices = (primitive: GltfPrimitiveLike): boolean => {
	const { indices } = primitive;
	const normalizedIndices = toSupportedScenegraphIndexArray(indices?.value);

	if (!indices || !normalizedIndices) {
		return false;
	}

	if (
		normalizedIndices === indices.value
		&& (indices.componentType === GLTF_UNSIGNED_SHORT || indices.componentType === GLTF_UNSIGNED_INT)
	) {
		return false;
	}

	indices.value = normalizedIndices;
	indices.componentType = normalizedIndices instanceof Uint32Array
		? GLTF_UNSIGNED_INT
		: GLTF_UNSIGNED_SHORT;
	indices.type = 'SCALAR';
	indices.components = 1;
	indices.count = normalizedIndices.length;

	return true;
};

export const sanitizeScenegraphGltfAttributes = (
	gltf: ScenegraphGltfLike | null | undefined
): boolean => {
	let sanitized = false;

	for (const mesh of gltf?.meshes ?? []) {
		for (const primitive of mesh.primitives ?? []) {
			const { attributes } = primitive;
			if (!attributes) {
				continue;
			}

			for (const attributeName of Object.keys(attributes)) {
				if (isScenegraphRenderAttribute(attributeName)) {
					continue;
				}

				delete attributes[attributeName];
				sanitized = true;
			}
		}
	}

	return sanitized;
};

export const sanitizeScenegraphGltfForDeck = (
	gltf: ScenegraphGltfLike | null | undefined
): boolean => {
	let sanitized = sanitizeScenegraphGltfAttributes(gltf);

	for (const mesh of gltf?.meshes ?? []) {
		for (const primitive of mesh.primitives ?? []) {
			sanitized = normalizePrimitiveIndices(primitive) || sanitized;
		}
	}

	return sanitized;
};
