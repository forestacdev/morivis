<script lang="ts">
	import DimensionSelector from '../raster_option/DimensionSelector.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import { DEFAULT_MESH_SHADING } from '$routes/map/data/types/model';
	import type { ModelMeshEntry, MeshStyle } from '$routes/map/data/types/model';

	interface Props {
		layerEntry: ModelMeshEntry<MeshStyle>;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();
	let temporalDimension = $derived(layerEntry.properties?.temporal?.dimension);
	let showDimensionOption = $state(false);

	const ensureShading = () => {
		layerEntry.style.shading ??= { ...DEFAULT_MESH_SHADING };
	};

	ensureShading();

	$effect(() => {
		ensureShading();
		if (temporalDimension && !layerEntry.state?.dimension) {
			layerEntry.state = {
				...layerEntry.state,
				dimension: {
					currentIndex: 0
				}
			};
		}
	});
</script>

{#if temporalDimension}
	<div class="mt-4">
		<DimensionSelector bind:layerEntry bind:showDimensionOption />
	</div>
{/if}

<div class="mt-4">
	<Switch label="ワイヤーフレーム表示" bind:value={layerEntry.style.wireframe} />
</div>

<div class="mt-4">
	<Switch label="陰影" bind:value={layerEntry.style.shading!.enabled} />
</div>

{#if layerEntry.style.shading!.enabled}
	<div class="mt-4 flex w-full flex-col gap-4">
		<RangeSlider
			label="陰影強度"
			bind:value={layerEntry.style.shading!.shadeStrength}
			min={0}
			max={1.5}
			step={0.05}
			icon="mdi:weather-sunny-alert"
		/>

		<RangeSlider
			label="環境光"
			bind:value={layerEntry.style.shading!.ambientStrength}
			min={0}
			max={1}
			step={0.05}
			icon="mdi:lightbulb-on-outline"
		/>

		<RangeSlider
			label="光源の方位角 (°)"
			bind:value={layerEntry.style.shading!.azimuthDeg}
			min={0}
			max={360}
			step={1}
			isInt
			icon="mdi:compass-outline"
		/>

		<RangeSlider
			label="光源の仰角 (°)"
			bind:value={layerEntry.style.shading!.elevationDeg}
			min={0}
			max={90}
			step={1}
			isInt
			icon="mdi:weather-sunset-up"
		/>
	</div>
{/if}

<div class="mt-4 flex w-full flex-col gap-4">
	<RangeSlider
		label="スケール"
		bind:value={layerEntry.style.transform.scale}
		min={0.01}
		max={100}
		step={0.01}
		icon="mdi:resize"
	/>

	{#if layerEntry.style.transform.heightScale != null}
		<RangeSlider
			label="高さ倍率"
			bind:value={layerEntry.style.transform.heightScale}
			min={0.01}
			max={100}
			step={0.01}
			icon="mdi:image-filter-hdr"
		/>
	{/if}

	{#if layerEntry.style.transform.heightOffset != null}
		<RangeSlider
			label="高さオフセット (m)"
			bind:value={layerEntry.style.transform.heightOffset}
			min={-100}
			max={1000}
			step={1}
			isInt
			icon="mdi:arrow-up-down"
		/>
	{/if}

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
