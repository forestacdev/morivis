<script lang="ts">
	import Icon from '@iconify/svelte';
	import { endsWith } from 'es-toolkit/compat';
	import gsap from 'gsap';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import CheckBox from '$map/components/atoms/CheckBox.svelte';
	import RangeSlider from '$map/components/atoms/RangeSlider.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import type { GeometryType } from '$map/data/types/vector';
	import { generateNumberAndColorMap, generateNumberMap } from '$map/utils/colorMapping';
	import {
		mutableColorMapType,
		type VectorLayerType,
		type ColorsExpressions,
		type LabelsExpressions
	} from '$routes/map/data/types/vector/style';

	let { layerToEdit = $bindable() }: { layerToEdit: GeoDataEntry } = $props();

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
		{#if layerToEdit.metaData.legend}
			<h1>凡例</h1>

			<h2>{layerToEdit.metaData.legend.name}</h2>
			<ul class="">
				{#each layerToEdit.metaData.legend.colors as color, i}
					<li style="display: flex; align-items: center; margin-bottom: 5px;">
						<span
							style="width: 20px; height: 20px; background-color: {color}; margin-right: 10px; display: inline-block;"
						>
						</span>
						<span>{layerToEdit.metaData.legend.labels[i]}</span>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
{/if}

<style>
</style>
