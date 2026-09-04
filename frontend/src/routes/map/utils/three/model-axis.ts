import type { MeshFormatType, MeshStyle } from '$routes/map/data/types/model';
import type { EpsgCode } from '$routes/map/utils/proj/dict';

export const getModelBaseRotationX = (
	format: MeshFormatType,
	preserveSourceOrientation = false
) => {
	if (format === '3mf') return 90;
	// CAD 系 FBX だけは Z-up を補正する。ゲーム系など Y-up の FBX は汎用モデルと同じ基準を使う。
	if (format === 'fbx' && !preserveSourceOrientation) return 90;
	return -180;
};

export const applyProjectedModelAxisOverride = (
	transform: MeshStyle['transform'],
	format: MeshFormatType,
	projectedModelEpsg?: EpsgCode
) => {
	if (format === 'obj' && projectedModelEpsg) {
		transform.baseRotationX = 90;
	}
};
