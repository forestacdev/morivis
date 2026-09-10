import type {
	MeshFormatType,
	MeshUpAxis,
	ProjectedModelGeoreference
} from '$routes/map/data/types/model';
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
	upAxis?: MeshUpAxis;
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
		// STLは軸情報を持たないため選択値を使う。FBXは既存のCAD向け既定値を維持する。
		const verticalAxis = options.upAxis
			?? (options.formatType === 'fbx' || options.formatType === 'stl' ? 'z' : 'y');
		normalizeObjectToLocalOrigin(object, verticalAxis);
	}
};
