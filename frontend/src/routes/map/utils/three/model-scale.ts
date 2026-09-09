import type { ModelTransformStyle } from '$routes/map/data/types/model';

export interface NormalizedModelScale {
	scale: number;
	scaleUnit: number;
}

const getScaleUnit = (scaleUnit?: number) =>
	Number.isFinite(scaleUnit) ? Math.trunc(scaleUnit ?? 0) : 0;

export const getEffectiveModelScale = (
	transform: Pick<ModelTransformStyle['transform'], 'scale' | 'scaleUnit'>
) => transform.scale * 10 ** getScaleUnit(transform.scaleUnit);

export const normalizeModelScale = (effectiveScale: number): NormalizedModelScale => {
	if (!Number.isFinite(effectiveScale) || effectiveScale === 0) {
		return { scale: effectiveScale, scaleUnit: 0 };
	}

	const scaleUnit = Math.floor(Math.log10(Math.abs(effectiveScale)));
	return {
		scale: effectiveScale / 10 ** scaleUnit,
		scaleUnit
	};
};

export const normalizeModelTransformScale = (
	transform: Pick<ModelTransformStyle['transform'], 'scale' | 'scaleUnit'>
) => normalizeModelScale(getEffectiveModelScale(transform));
