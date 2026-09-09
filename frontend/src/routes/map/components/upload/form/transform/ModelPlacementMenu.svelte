<script lang="ts">
	import ModelScaleControl from '$routes/map/components/atoms/ModelScaleControl.svelte';

	interface Props {
		lng: number;
		lat: number;
		altitude: number;
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
		scale = $bindable(),
		scaleUnit = $bindable(),
		rotationX = $bindable(),
		rotationY = $bindable(),
		rotationZ = $bindable()
	}: Props = $props();

	const rotateQuarterTurn = (rotation: number) => ((rotation + 90) % 360 + 360) % 360;
</script>

<div class="c-scroll flex h-full w-full grow flex-col gap-4 overflow-x-hidden overflow-y-auto px-2">
	<div class="rounded-md bg-black/15 p-3 text-sm text-gray-200">
		赤い立体ボックスをドラッグすると配置位置を動かせます。頂点を動かすと、対角点を固定してY回転と大きさを調整します。
	</div>
	<label class="flex w-full flex-col gap-1 text-sm">
		<span>経度</span>
		<input class="c-input w-full" type="number" step="any" bind:value={lng} />
	</label>
	<label class="flex w-full flex-col gap-1 text-sm">
		<span>緯度</span>
		<input class="c-input w-full" type="number" step="any" bind:value={lat} />
	</label>
	<label class="flex w-full flex-col gap-1 text-sm">
		<span>高さ (m)</span>
		<input class="c-input w-full" type="number" step="0.1" bind:value={altitude} />
	</label>
	<ModelScaleControl
		{scale}
		{scaleUnit}
		onChange={(value) => {
			scale = value.scale;
			scaleUnit = value.scaleUnit;
		}}
	/>
	<label class="flex w-full flex-col gap-1 text-sm">
		<span>Y回転 (°)</span>
		<input class="c-input w-full" type="number" step="1" bind:value={rotationY} />
	</label>
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
