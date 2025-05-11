<script lang="ts">
	import type { GeoDataEntry } from '$routes/data/types';
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

{#if layerType === 'raster' && style.type === 'categorical'}
	{#if style.legend.type === 'category'}
		<h2 class="text-gray-100">{style.legend.name}</h2>
		<ul class="text-gray-100">
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
	{#if style.legend.type === 'gradient'}
		<h2 class="text-gray-100">{style.legend.name}</h2>
		<div class="flex w-full flex-col gap-2 text-gray-100">
			<div class="w-full">
				<div
					class="h-[25px] w-full rounded-md"
					style="background: linear-gradient(90deg, {style.legend.colors[0]} 0%, {style.legend
						.colors[1]} 100%);"
				></div>
			</div>

			<div class="flex w-full justify-between">
				{#each style.legend.range.slice() as value}
					<span>{value} {style.legend.unit}</span>
				{/each}
			</div>
		</div>
	{/if}
{/if}

{#if setColorExpression}
	{#if layerType === 'vector'}
		{#if setColorExpression.type === 'single'}
			<div class="flex-between flex w-full select-none items-center gap-2 text-gray-100">
				<div
					class="h-[20px] w-[20px] flex-none rounded-full"
					style="background-color: {setColorExpression.mapping.value};"
				></div>
				<div class="w-full">単色</div>
			</div>
		{:else if setColorExpression.type === 'match'}
			{#each setColorExpression.mapping.categories as _, index}
				<div class="flex-between flex w-full select-none items-center gap-2 text-gray-100">
					<div
						class="h-[20px] w-[20px] flex-none rounded-full"
						style="background-color: {setColorExpression.mapping.values[index]};"
					></div>
					<div class="w-full">{setColorExpression.mapping.categories[index]}</div>
				</div>
			{/each}
		{:else if setColorExpression.type === 'step'}
			{#if stepPallet}
				{#each stepPallet.categories as _, index}
					<div
						class="flex w-full select-none items-center items-center justify-center gap-2 text-gray-100"
					>
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
