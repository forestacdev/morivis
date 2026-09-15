import type { ModelLocalBounds, ModelTransformStyle } from '$routes/map/data/types/model';
import { getEffectiveModelScale } from './model-scale';

const finiteOr = (value: number | undefined, fallback: number) =>
	value !== undefined && Number.isFinite(value) ? value : fallback;

const roundRangeUp = (value: number) => {
	const magnitude = 10 ** Math.floor(Math.log10(value));
	const normalized = value / magnitude;
	const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
	return Number((factor * magnitude).toPrecision(12));
};

/** 実寸の最大辺を基準に、高さオフセットの範囲と操作精度を求める。 */
export const getModelHeightOffsetSliderRange = ({
	localBounds,
	transform,
	heightOffset = 0
}: {
	localBounds?: ModelLocalBounds;
	transform: Pick<
		ModelTransformStyle['transform'],
		'scale' | 'scaleUnit' | 'baseScale' | 'heightScale'
	>;
	heightOffset?: number;
}) => {
	const heightScale = Math.abs(finiteOr(transform.heightScale, 1));
	const localSize = localBounds
		? Math.max(
			Math.abs(localBounds[3] - localBounds[0]),
			Math.abs(localBounds[4] - localBounds[1]) * heightScale,
			Math.abs(localBounds[5] - localBounds[2])
		)
		: 100;
	const scale = Math.abs(
		finiteOr(getEffectiveModelScale(transform), 1) * finiteOr(transform.baseScale, 1)
	);
	const modelSize = Math.max(finiteOr(localSize * scale, 100), 0.001);
	const extent = roundRangeUp(Math.max(modelSize, Math.abs(finiteOr(heightOffset, 0))));
	const step = Math.max(roundRangeUp(modelSize / 500), 0.000001);
	const fractionDigits = Math.max(0, -Math.floor(Math.log10(step)));
	return { min: -extent, max: extent, step, fractionDigits };
};
