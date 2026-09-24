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

/** 入力座標の1単位に対応する地図上の長さ。固定倍率も含めて計算する。 */
export const getModelUnitMeters = (
	transform: Pick<ModelTransformStyle['transform'], 'scale' | 'scaleUnit' | 'baseScale'>
) => (transform.baseScale ?? 1) * getEffectiveModelScale(transform);

/** メートル指定を既存の倍率へ戻す。無効な入力でモデルを消したり壊したりしない。 */
export const normalizeModelUnitMeters = (
	meters: number,
	baseScale = 1
): NormalizedModelScale | null => {
	if (!Number.isFinite(meters) || meters <= 0 || !Number.isFinite(baseScale) || baseScale <= 0) {
		return null;
	}
	const effectiveScale = meters / baseScale;
	if (!Number.isFinite(effectiveScale) || effectiveScale <= 0) return null;
	const normalized = normalizeModelScale(effectiveScale);
	return Number.isFinite(normalized.scale) && normalized.scale > 0 ? normalized : null;
};
