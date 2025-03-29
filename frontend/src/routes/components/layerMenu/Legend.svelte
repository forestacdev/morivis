<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { BackgroundLayerSpecification } from 'maplibre-gl';
	import { slide } from 'svelte/transition';
	import { fade } from 'svelte/transition';

	import LayerIcon from '$routes/components/atoms/LayerIcon.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import type { ColorsExpression } from '$routes/data/types/vector/style';
	import { addedLayerIds, selectedLayerId, isEdit } from '$routes/store';
	import { showDataMenu } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import { generateNumberAndColorMap } from '$routes/utils/colorMapping';

	interface Props {
		layerEntry: GeoDataEntry;
	}

	let { layerEntry }: Props = $props();

	let style = $derived(layerEntry.style);
	let layerType = $derived(layerEntry.type);
	let setColorExpression = $derived.by(() => {
		if (!layerEntry || layerEntry.type !== 'vector') return;
		return layerEntry.style.colors.expressions.find(
			(color) => color.key === layerEntry.style.colors.key
		);
	});

	// step用のパレットを生成
	let stepPallet = $derived.by(() => {
		if (setColorExpression && setColorExpression.type === 'step') {
			return generateNumberAndColorMap(setColorExpression.mapping);
		}
	});
</script>

{#if setColorExpression}
	{#if layerType === 'raster' && style.type === 'categorical' && style.legend.type === 'category'}
		<h2>{style.legend.name}</h2>
		<ul class="">
			{#each style.legend.colors as color, i}
				<li style="display: flex; align-items: center; margin-bottom: 5px;">
					<span
						style="width: 20px; height: 20px; background-color: {color}; margin-right: 10px; display: inline-block;"
					>
					</span>
					<span>{style.legend.labels[i]}</span>
				</li>
			{/each}
		</ul>
	{/if}
	{#if layerType === 'vector'}
		{#if setColorExpression.type === 'single'}
			<div class="flex-between flex w-full select-none gap-2">
				<div
					class="w-full rounded-full p-2"
					style="background-color: {setColorExpression.mapping.value};"
				></div>
			</div>
		{:else if setColorExpression.type === 'match'}
			{#each setColorExpression.mapping.categories as _, index}
				<div class="flex-between flex w-full select-none gap-2">
					<div
						class="h-[20px] w-[20px] flex-none rounded-full"
						style="background-color: {setColorExpression.mapping.values[index]};"
					></div>
					<div class="w-full">{setColorExpression.mapping.categories[index]}</div>
				</div>
			{/each}
		{:else if setColorExpression.type === 'step'}
			{#if stepPallet}
				<h2></h2>
				{#each stepPallet.categories as _, index}
					<div class="flex w-full select-none items-center justify-center gap-2">
						<div
							class="h-[20px] w-[20px] flex-none rounded-full"
							style="background-color: {stepPallet.values[index]};"
						></div>
						<div class="w-full">{stepPallet.categories[index]}</div>
					</div>
				{/each}
			{/if}
		{/if}
	{/if}
{/if}

<style>
</style>
