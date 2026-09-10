import * as THREE from 'three';

/**
 * 単体ビューの床面を決める。明示値がないモデルは、従来どおり形状全体の最下端を使う。
 * 複数モデルでは最も低い明示値を使い、どのモデルの床もグリッドより上に保つ。
 */
export const resolveModelViewFloorY = (
	bounds: THREE.Box3,
	configuredFloorYs: Array<number | undefined>
) => {
	const floorYs = configuredFloorYs.filter(
		(floorY): floorY is number => floorY != null && Number.isFinite(floorY)
	);
	return floorYs.length > 0 ? Math.min(...floorYs) : bounds.min.y;
};
