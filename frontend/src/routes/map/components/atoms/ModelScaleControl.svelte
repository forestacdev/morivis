<script lang="ts">
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import {
		getEffectiveModelScale,
		normalizeModelTransformScale,
		type NormalizedModelScale
	} from '$routes/map/utils/three/model-scale';

	interface Props {
		scale: number;
		scaleUnit?: number;
		onChange: (value: NormalizedModelScale) => void;
	}

	let { scale, scaleUnit, onChange }: Props = $props();
	const normalizedScale = $derived(normalizeModelTransformScale({ scale, scaleUnit }));
	const effectiveScale = $derived(getEffectiveModelScale({ scale, scaleUnit }));
	const effectiveScaleLabel = $derived.by(() => {
		const absoluteScale = Math.abs(effectiveScale);
		if (absoluteScale >= 1_000_000 || (absoluteScale > 0 && absoluteScale < 0.001)) {
			return effectiveScale.toExponential(2);
		}
		return effectiveScale.toLocaleString('ja-JP', { maximumFractionDigits: 4 });
	});

	const updateScale = (value: number) => {
		onChange({ scale: value, scaleUnit: normalizedScale.scaleUnit });
	};

	const shiftScaleUnit = (amount: number) => {
		onChange({
			scale: normalizedScale.scale,
			scaleUnit: normalizedScale.scaleUnit + amount
		});
	};
</script>

<div class="flex flex-col gap-2">
	<RangeSlider
		label="スケール"
		value={normalizedScale.scale}
		min={0}
		max={9.99}
		step={0.01}
		onInput={updateScale}
	/>
	<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pb-2">
		<button type="button" class="c-btn-sub px-3 py-2 text-sm" onclick={() => shiftScaleUnit(-1)}>
			÷10
		</button>
		<div class="min-w-28 text-center text-sm text-base">
			<div>倍率単位 ×10<sup>{normalizedScale.scaleUnit}</sup></div>
			<div class="text-xs opacity-70">実倍率 ×{effectiveScaleLabel}</div>
		</div>
		<button type="button" class="c-btn-sub px-3 py-2 text-sm" onclick={() => shiftScaleUnit(1)}>
			×10
		</button>
	</div>
</div>
