import type { MeshStyle } from '$routes/map/data/types/model';
import { DoubleSide, FrontSide, type Side } from 'three';

export const resolveModelFaceSide = (sourceSide: Side, faceSide: MeshStyle['faceSide']): Side => {
	if (faceSide === 'double') return DoubleSide;
	if (faceSide === 'front') return FrontSide;
	return sourceSide;
};
