import * as THREE from 'three';

export interface EdgeUvGeometry {
	geometry: THREE.BufferGeometry;
	generated: boolean;
}

const AXIS_EPSILON = 0.000000001;

type Axis = 'x' | 'y' | 'z';

const getAxisValue = (attribute: THREE.BufferAttribute, index: number, axis: Axis) => {
	if (axis === 'x') return attribute.getX(index);
	if (axis === 'y') return attribute.getY(index);
	return attribute.getZ(index);
};

const normalizeAxisValue = (value: number, min: number, max: number) => {
	const range = max - min;
	return range > AXIS_EPSILON ? (value - min) / range : 0.5;
};

const resolveProjectionAxes = (
	normal: THREE.BufferAttribute | undefined,
	index: number,
	size: THREE.Vector3
): [Axis, Axis] => {
	if (normal && normal.itemSize >= 3) {
		const x = Math.abs(normal.getX(index));
		const y = Math.abs(normal.getY(index));
		const z = Math.abs(normal.getZ(index));
		if (x >= y && x >= z) return ['z', 'y'];
		if (y >= x && y >= z) return ['x', 'z'];
		return ['x', 'y'];
	}

	const axes: Array<[Axis, number]> = [
		['x', size.x],
		['y', size.y],
		['z', size.z]
	];
	axes.sort(([, leftSize], [, rightSize]) => rightSize - leftSize);
	return [axes[0][0], axes[1][0]];
};

const getBoundsAxisValue = (bounds: THREE.Box3, axis: Axis, edge: 'min' | 'max') =>
	edge === 'min' ? bounds.min[axis] : bounds.max[axis];

/**
 * UVがないモデルでもエッジ用シェーダーを描けるよう、法線に応じたボックス投影UVを生成する。
 * 元モデルのUVを追加するとテクスチャの貼り方が変わるため、エッジ専用の複製ジオメトリだけへ付与する。
 */
export const createEdgeUvGeometry = (source: THREE.BufferGeometry): EdgeUvGeometry | null => {
	if (source.getAttribute('uv')) {
		return { geometry: source, generated: false };
	}

	const position = source.getAttribute('position');
	if (
		!(position instanceof THREE.BufferAttribute) || position.itemSize < 3
		|| position.count === 0
	) {
		return null;
	}

	const geometry = source.clone();
	geometry.computeBoundingBox();
	const bounds = geometry.boundingBox;
	if (!bounds) return null;

	const normal = geometry.getAttribute('normal');
	const normalAttribute = normal instanceof THREE.BufferAttribute ? normal : undefined;
	const uv = new Float32Array(position.count * 2);
	const size = bounds.getSize(new THREE.Vector3());
	for (let index = 0; index < position.count; index++) {
		const [uAxis, vAxis] = resolveProjectionAxes(normalAttribute, index, size);
		uv[index * 2] = normalizeAxisValue(
			getAxisValue(position, index, uAxis),
			getBoundsAxisValue(bounds, uAxis, 'min'),
			getBoundsAxisValue(bounds, uAxis, 'max')
		);
		uv[index * 2 + 1] = normalizeAxisValue(
			getAxisValue(position, index, vAxis),
			getBoundsAxisValue(bounds, vAxis, 'min'),
			getBoundsAxisValue(bounds, vAxis, 'max')
		);
	}

	geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	geometry.userData.morivisGeneratedEdgeUv = true;
	return { geometry, generated: true };
};
