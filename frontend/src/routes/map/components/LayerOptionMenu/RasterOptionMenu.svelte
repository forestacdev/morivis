<script lang="ts">
	import Icon from '@iconify/svelte';
	import gsap from 'gsap';
	import { onMount } from 'svelte';

	import CheckBox from '$map/components/atoms/CheckBox.svelte';
	import RangeSlider from '$map/components/atoms/RangeSlider.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import type {
		RasterEntry,
		RasterCategoricalStyle,
		RasterBaseMapStyle
	} from '$map/data/types/raster';
	import { generateNumberAndColorMap, generateNumberMap } from '$map/utils/colorMapping';

	let {
		layerToEdit = $bindable()
	}: { layerToEdit: RasterEntry<RasterCategoricalStyle | RasterBaseMapStyle> } = $props();

	onMount(() => {});
</script>

{#if layerToEdit && layerToEdit.type === 'raster' && layerToEdit.style}
	<RangeSlider
		label={'不透明度'}
		bind:value={layerToEdit.style.opacity}
		min={0}
		max={1}
		step={0.01}
	/>
	<!-- レイヤータイプの選択 -->
	{#if layerToEdit.style.type === 'basemap'}
		<RangeSlider
			label={'明るさ-最小輝度'}
			bind:value={layerToEdit.style.brightnessMin}
			min={0}
			max={1}
			step={0.01}
		/>
		<RangeSlider
			label={'明るさ-最大輝度'}
			bind:value={layerToEdit.style.brightnessMax}
			min={0}
			max={1}
			step={0.01}
		/>
		<RangeSlider
			label={'コントラスト'}
			bind:value={layerToEdit.style.contrast}
			min={-1}
			max={1}
			step={0.01}
		/>
		<RangeSlider
			label={'色相'}
			bind:value={layerToEdit.style.hueRotate}
			min={-360}
			max={360}
			step={0.1}
		/>
		<RangeSlider
			label={'彩度'}
			bind:value={layerToEdit.style.saturation}
			min={-1}
			max={1}
			step={0.01}
		/>
	{:else if layerToEdit.style.type === 'categorical'}
		<!-- TODO:categorical 凡例は必須にする -->
		{#if layerToEdit.style.legend}
			<h1>凡例</h1>

			<h2>{layerToEdit.style.legend.name}</h2>
			<ul class="">
				{#each layerToEdit.style.legend.colors as color, i}
					<li style="display: flex; align-items: center; margin-bottom: 5px;">
						<span
							style="width: 20px; height: 20px; background-color: {color}; margin-right: 10px; display: inline-block;"
						>
						</span>
						<span>{layerToEdit.style.legend.labels[i]}</span>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
{/if}

<style>
</style>
