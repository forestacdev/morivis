<script lang="ts">
	import LsiconDataFilledIcon from '$lib/components/svgs/icons/lsicon/DataFilledIcon.svelte';
	import type { RasterCategoricalStyle } from '$routes/map/data/types/raster';
	import { createGradientStops, resolveRasterLegend } from '$routes/map/utils/raster/legend';

	interface Props {
		style: RasterCategoricalStyle;
		dimensionValue?: string;
	}

	let { style, dimensionValue }: Props = $props();
	let legend = $derived(resolveRasterLegend(style, dimensionValue));
</script>

<div class="mt-8 flex items-center gap-1 text-base text-lg">
	<LsiconDataFilledIcon class="h-6 w-6" />
	<span>凡例</span>
</div>
<div class="mt-2 flex-1 shrink-0 rounded-lg p-2 mix-blend-normal">
	<!-- 凡例には同じラベル・記号が複数現れる。表示専用の行は配列順に更新する。 -->
	{#if legend.type === 'category'}
		<h2 class="mb-2 text-base">{legend.name}</h2>
		<ul class="text-base">
			{#each legend.colors as color, i}
				<li style="display: flex; align-items: center; margin-bottom: 5px;">
					<span
						class="shrink-0 rounded-md border border-black"
						style="width: 20px; height: 20px; background-color: {color}; margin-right: 10px; display: inline-block;"
					>
					</span>
					<span class="min-w-0 flex-1 break-words">{legend.labels[i]}</span>
				</li>
			{/each}
		</ul>
	{:else if legend.type === 'gradient'}
		<h2 class="text-base">{legend.name}</h2>
		<div class="flex flex-col text-base">
			<div class="w-full py-[10px]">
				<div
					class="h-[30px] w-full rounded-lg border border-black"
					style="background: linear-gradient(90deg, {createGradientStops(legend.colors)});"
				></div>
			</div>

			<div class="flex justify-between text-base">
				{#each legend.ranges as value, i (`${value}-${i}`)}
					{#if i === 0 || i === legend.ranges.length - 1}
						<span>{value} {legend.unit}</span>
					{/if}
				{/each}
			</div>
		</div>
	{:else if legend.type === 'image'}
		<ul class="flex flex-col gap-2 text-base">
			{#each legend.categories as category}
				<h2 class="mt-4 text-base">{category.name}</h2>
				<div class="flex flex-col gap-2">
					{#each category.urls as url, j}
						<li class="flex items-center gap-2">
							<div
								class="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-black bg-white p-2"
							>
								<img
									src={url}
									alt={category.labels[j]}
									class="aspect-square object-contain select-none"
									loading="lazy"
								/>
							</div>
							<span class="min-w-0 flex-1 break-words text-sm">{category.labels[j]} </span>
						</li>
					{/each}
				</div>
			{/each}
		</ul>
	{/if}
</div>
