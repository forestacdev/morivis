<script lang="ts">
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import type { ModelSourceUnit } from '$routes/map/data/types/model';
	import {
		getEffectiveModelScale,
		getModelUnitMeters,
		normalizeModelUnitMeters,
		normalizeModelTransformScale,
		type NormalizedModelScale
	} from '$routes/map/utils/three/model-scale';

	interface Props {
		scale: number;
		scaleUnit?: number;
		sourceUnit?: ModelSourceUnit;
		baseScale?: number;
		onChange: (value: NormalizedModelScale) => void;
	}

	let { scale, scaleUnit, sourceUnit, baseScale = 1, onChange }: Props = $props();
	const inputId = $props.id();
	// 編集中の無効値は保持し、地図上のドラッグなどで倍率が変わると実寸へ戻す。
	let unitMeters = $derived<number | undefined>(
		getModelUnitMeters({ scale, scaleUnit, baseScale })
	);
	const unitMetersInvalid = $derived(
		normalizeModelUnitMeters(unitMeters ?? Number.NaN, baseScale) === null
	);
	const updateUnitMeters = (value: number | undefined) => {
		unitMeters = value;
		const normalized = normalizeModelUnitMeters(value ?? Number.NaN, baseScale);
		if (normalized) onChange(normalized);
	};
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
	{#if sourceUnit === 'minecraft-block'}
		<label class="flex items-center gap-2 text-sm">
			<span class="shrink-0">1ブロック =</span>
			<input
				class="c-input min-w-0 flex-1"
				type="number"
				step="any"
				min="0"
				required
				aria-label="1ブロックの長さ（m）"
				aria-invalid={unitMetersInvalid}
				aria-describedby={unitMetersInvalid ? `${inputId}-meters-error` : undefined}
				bind:value={() => unitMeters, updateUnitMeters}
			/>
			<span>m</span>
		</label>
		{#if unitMetersInvalid}
			<p id={`${inputId}-meters-error`} class="text-sm text-red-400" aria-live="polite">
				1ブロックの長さは0より大きい有限の数値を入力してください。
			</p>
		{/if}
	{:else}
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
	{/if}
</div>
