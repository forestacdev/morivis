<script lang="ts">
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import type { MeshStyleEntry } from '$routes/map/data/types/model';

	interface Props {
		layerEntry: MeshStyleEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();
</script>

<div class="mt-4">
	<Switch label="ワイヤーフレーム表示" bind:value={layerEntry.style.wireframe} />
</div>

<div class="mt-4 flex w-full flex-col gap-4">
	<RangeSlider
		label="スケール"
		bind:value={layerEntry.style.transform.scale}
		min={0.01}
		max={100}
		step={0.01}
		icon="mdi:resize"
	/>

	<RangeSlider
		label="高さオフセット (m)"
		bind:value={layerEntry.style.transform.heightOffset}
		min={-100}
		max={1000}
		step={1}
		isInt
		icon="mdi:arrow-up-down"
	/>

	<RangeSlider
		label="X回転 (°)"
		bind:value={layerEntry.style.transform.rotationX}
		min={0}
		max={360}
		step={1}
		isInt
		icon="mdi:rotate-right"
	/>

	<RangeSlider
		label="Y回転 (°)"
		bind:value={layerEntry.style.transform.rotationY}
		min={0}
		max={360}
		step={1}
		isInt
		icon="mdi:rotate-right"
	/>

	<RangeSlider
		label="Z回転 (°)"
		bind:value={layerEntry.style.transform.rotationZ}
		min={0}
		max={360}
		step={1}
		isInt
		icon="mdi:rotate-right"
	/>
</div>

<style>
</style>
