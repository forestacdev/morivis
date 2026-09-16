<script lang="ts">
	import { untrack } from 'svelte';

	import ModelScaleControl from '$routes/map/components/atoms/ModelScaleControl.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import {
		WEB_MERCATOR_MIN_LAT,
		WEB_MERCATOR_MAX_LAT
	} from '$routes/map/data/entries/_meta_data/_bounds';
	import type { ModelLocalBounds } from '$routes/map/data/types/model';
	import { getModelHeightOffsetSliderRange } from '$routes/map/utils/three/model-height-offset';
	import {
		isValidModelPlacementLatitude,
		isValidModelPlacementLongitude
	} from '$routes/map/utils/three/model-placement-coordinates';

	interface Props {
		lng: number | undefined;
		lat: number | undefined;
		altitude: number;
		heightOffset: number;
		localBounds?: ModelLocalBounds;
		baseScale?: number;
		heightScale?: number;
		canEditHeightOffset?: boolean;
		scale: number;
		scaleUnit: number;
		rotationX: number;
		rotationY: number;
		rotationZ: number;
	}

	let {
		lng = $bindable(),
		lat = $bindable(),
		altitude = $bindable(),
		heightOffset = $bindable(),
		localBounds,
		baseScale,
		heightScale,
		canEditHeightOffset = true,
		scale = $bindable(),
		scaleUnit = $bindable(),
		rotationX = $bindable(),
		rotationY = $bindable(),
		rotationZ = $bindable()
	}: Props = $props();
	const inputId = $props.id();
	const lngInvalid = $derived(!isValidModelPlacementLongitude(lng));
	const latInvalid = $derived(!isValidModelPlacementLatitude(lat));

	const heightOffsetSliderRange = $derived(
		getModelHeightOffsetSliderRange({
			localBounds,
			transform: { scale, scaleUnit, baseScale, heightScale },
			// 高さをドラッグしている間は範囲を固定する。
			heightOffset: untrack(() => heightOffset)
		})
	);

	const rotateQuarterTurn = (rotation: number) => (((rotation + 90) % 360) + 360) % 360;
</script>

<div class="c-scroll flex h-full w-full grow flex-col gap-4 overflow-x-hidden overflow-y-auto px-2">
	<div class="rounded-md bg-black/15 p-3 text-sm text-gray-200">
		赤い立体ボックスをドラッグすると配置位置を動かせます。頂点を動かすと、対角点を固定してY回転と大きさを調整します。
	</div>
	<label class="flex w-full flex-col gap-1 text-sm">
		<span>経度</span>
		<input
			class="coordinate-input bg-base text-main w-full rounded-lg p-2 focus:outline-0"
			type="number"
			step="any"
			bind:value={lng}
			min={-180}
			max={180}
			required
			aria-invalid={lngInvalid}
			aria-describedby={lngInvalid ? `${inputId}-lng-error` : undefined}
		/>
		{#if lngInvalid}
			<span id={`${inputId}-lng-error`} class="text-red-400" aria-live="polite">
				経度は −180〜180°の数値を入力してください。
			</span>
		{/if}
	</label>
	<label class="flex w-full flex-col gap-1 text-sm">
		<span>緯度</span>
		<input
			class="coordinate-input bg-base text-main w-full rounded-lg p-2 focus:outline-0"
			type="number"
			step="any"
			bind:value={lat}
			min={WEB_MERCATOR_MIN_LAT}
			max={WEB_MERCATOR_MAX_LAT}
			required
			aria-invalid={latInvalid}
			aria-describedby={latInvalid ? `${inputId}-lat-error` : undefined}
		/>
		{#if latInvalid}
			<span id={`${inputId}-lat-error`} class="text-red-400" aria-live="polite">
				緯度は地図の表示範囲（約 −85.051〜85.051°）内の数値を入力してください。
			</span>
		{/if}
	</label>
	<!-- <label class="flex w-full flex-col gap-1 text-sm">
		<span>高さ (m)</span>
		<input class="c-form-field w-full" type="number" step="0.1" bind:value={altitude} />
	</label> -->
	{#if canEditHeightOffset}
		<RangeSlider
			label="高さオフセット (m)"
			bind:value={heightOffset}
			min={heightOffsetSliderRange.min}
			max={heightOffsetSliderRange.max}
			step={heightOffsetSliderRange.step}
			fractionDigits={heightOffsetSliderRange.fractionDigits}
			icon="mdi:arrow-up-down"
		/>
	{/if}
	<ModelScaleControl
		{scale}
		{scaleUnit}
		onChange={(value) => {
			scale = value.scale;
			scaleUnit = value.scaleUnit;
		}}
	/>
	<RangeSlider
		label="Y回転 (°)"
		bind:value={
			() => (rotationY < 0 || rotationY > 360 ? ((rotationY % 360) + 360) % 360 : rotationY),
			(value) => (rotationY = value)
		}
		min={0}
		max={360}
		step={1}
		isInt
		icon="mdi:rotate-right"
	/>
	<div class="grid grid-cols-2 gap-2">
		<button
			type="button"
			class="c-btn-sub flex flex-col items-center gap-1 px-3 py-2 text-sm"
			onclick={() => (rotationX = rotateQuarterTurn(rotationX))}
		>
			<span>X軸を +90°</span>
			<span class="text-xs opacity-70">現在 {rotationX.toFixed(0)}°</span>
		</button>
		<button
			type="button"
			class="c-btn-sub flex flex-col items-center gap-1 px-3 py-2 text-sm"
			onclick={() => (rotationZ = rotateQuarterTurn(rotationZ))}
		>
			<span>Z軸を +90°</span>
			<span class="text-xs opacity-70">現在 {rotationZ.toFixed(0)}°</span>
		</button>
	</div>
</div>

<style>
	.coordinate-input[aria-invalid='true'] {
		outline: 1px solid #f87171;
	}

	.coordinate-input {
		-moz-appearance: textfield;
		appearance: textfield;
	}

	.coordinate-input::-webkit-inner-spin-button,
	.coordinate-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
</style>
