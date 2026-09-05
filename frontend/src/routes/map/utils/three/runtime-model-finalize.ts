import type { MeshFormatType, ProjectedModelGeoreference } from '$routes/map/data/types/model';
import {
	applyProjectedModelGeoreference,
	resolveFbxUnitScaleMeters
} from '$routes/map/utils/three/model-georeference';
import { normalizeObjectToLocalOrigin } from '$routes/map/utils/three/object-normalization';
import * as THREE from 'three';

interface FinalizeRuntimeModelOptions {
	formatType: MeshFormatType;
	georeference?: ProjectedModelGeoreference;
	normalizeToLocalOrigin?: boolean;
}

export const finalizeRuntimeModelObject = (
	object: THREE.Object3D,
	options: FinalizeRuntimeModelOptions
) => {
	if (options.georeference) {
		applyProjectedModelGeoreference(object, options.georeference);
		return;
	}

	if (options.formatType === 'fbx') {
		const unitScaleMeters = resolveFbxUnitScaleMeters(
			new THREE.Box3().setFromObject(object),
			Number(
				(object.userData as {
					unitScaleFactor?: number;
				}).unitScaleFactor
			)
		);
		if (unitScaleMeters !== 1) {
			object.scale.multiplyScalar(unitScaleMeters);
			object.updateMatrixWorld(true);
		}
	}

	if (options.normalizeToLocalOrigin) {
		// GLB/IFC は Y-up、CAD 系 FBX は Z-up のため、地図の高さ 0 に合う下端軸が異なる。
		normalizeObjectToLocalOrigin(object, options.formatType === 'fbx' ? 'z' : 'y');
	}
};
