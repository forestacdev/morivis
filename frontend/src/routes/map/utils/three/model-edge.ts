import { DEFAULT_MESH_EDGE, type MeshStyle } from '$routes/map/data/types/model';
import * as THREE from 'three';

const MIN_SILHOUETTE_WIDTH_PX = 1;
const MAX_SILHOUETTE_WIDTH_PX = 6;
const DEFAULT_SILHOUETTE_WIDTH_PX = 1.5;

export const resolveMeshEdgeUniforms = (style: Pick<MeshStyle, 'edge'>) => {
	const edge = { ...DEFAULT_MESH_EDGE, ...style.edge };
	const thickness = Math.max(edge.thickness, 0.0001);
	const silhouetteWidthPx = THREE.MathUtils.clamp(
		DEFAULT_SILHOUETTE_WIDTH_PX * (thickness / DEFAULT_MESH_EDGE.thickness),
		MIN_SILHOUETTE_WIDTH_PX,
		MAX_SILHOUETTE_WIDTH_PX
	);

	return {
		enabled: Boolean(style.edge?.enabled),
		color: new THREE.Color(edge.color),
		thickness,
		// UV境界のモデル空間線幅を、曲面輪郭用のピクセル線幅にも対応付ける。
		silhouetteWidthPx,
		// モデル本体の透明度とは独立して、エッジは常に不透明に描く。
		opacity: 1
	};
};
