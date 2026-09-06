import { DEFAULT_MESH_SHADING, type MeshStyle } from '$routes/map/data/types/model';
import * as THREE from 'three';

export const resolveMeshShadingUniforms = (style: Pick<MeshStyle, 'shading'>) => {
	const shading = { ...DEFAULT_MESH_SHADING, ...style.shading };
	const azimuth = THREE.MathUtils.degToRad(shading.azimuthDeg);
	const elevation = THREE.MathUtils.degToRad(shading.elevationDeg);
	const cosElevation = Math.cos(elevation);
	const enabled = Boolean(style.shading?.enabled);

	return {
		ambientStrength: enabled ? shading.ambientStrength : 1,
		shadeStrength: enabled ? shading.shadeStrength : 0,
		lightDirection: new THREE.Vector3(
			Math.cos(azimuth) * cosElevation,
			Math.sin(elevation),
			Math.sin(azimuth) * cosElevation
		).normalize()
	};
};
