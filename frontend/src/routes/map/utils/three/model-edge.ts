import { DEFAULT_MESH_EDGE, type MeshStyle } from '$routes/map/data/types/model';
import * as THREE from 'three';

export const resolveMeshEdgeUniforms = (style: Pick<MeshStyle, 'edge'>) => {
	const edge = { ...DEFAULT_MESH_EDGE, ...style.edge };

	return {
		enabled: Boolean(style.edge?.enabled),
		color: new THREE.Color(edge.color),
		thickness: Math.max(edge.thickness, 0.0001),
		// モデル本体の透明度とは独立して、エッジは常に不透明に描く。
		opacity: 1
	};
};
