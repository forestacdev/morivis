import type { MeshStyle, MeshFormatType } from '$routes/map/data/types/model';
import type { EpsgCode } from '$routes/map/utils/proj/dict';

export const applyProjectedModelAxisOverride = (
	transform: MeshStyle['transform'],
	format: MeshFormatType,
	projectedModelEpsg?: EpsgCode
) => {
	if (format === 'obj' && projectedModelEpsg) {
		transform.baseRotationX = 90;
	}
};
