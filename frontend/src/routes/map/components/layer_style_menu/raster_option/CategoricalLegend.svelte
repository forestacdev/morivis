<script lang="ts">
	import Icon from '@iconify/svelte';

	import type { RasterCategoricalStyle } from '$routes/map/data/types/raster';

	interface Props {
		style: RasterCategoricalStyle;
	}

	let { style }: Props = $props();

	const createGradientStops = (colors: string[]): string => {
		if (colors.length <= 1) {
			return colors[0] ?? '';
		}

		return colors
			.map((color, index) => {
				const position = (index / (colors.length - 1)) * 100;
				return `${color} ${position.toFixed(1)}%`;
			})
			.join(', ');
	};
</script>

<div class="mt-8 flex items-center gap-1 text-base text-lg">
	<Icon icon="lsicon:data-filled" class="h-6 w-6" />
	<span>凡例</span>
</div>
<div class="mt-2 flex-1 shrink-0 rounded-lg p-2 mix-blend-normal">
	{#if style.legend.type === 'category'}
		<h2 class="mb-2 text-base">{style.legend.name}</h2>
		<ul class="text-base">
			{#each style.legend.colors as color, i (`${style.legend.labels[i] ?? color}-${color}`)}
				<li style="display: flex; align-items: center; margin-bottom: 5px;">
					<span
						class="rounded-md border border-black"
						style="width: 20px; height: 20px; background-color: {color}; margin-right: 10px; display: inline-block;"
					>
					</span>
					<span>{style.legend.labels[i]}</span>
				</li>
			{/each}
		</ul>
	{:else if style.legend.type === 'gradient'}
		<h2 class="text-base">{style.legend.name}</h2>
		<div class="flex flex-col text-base">
			<div class="w-full py-[10px]">
				<div
					class="h-[30px] w-full rounded-lg border border-black"
					style="background: linear-gradient(90deg, {createGradientStops(style.legend.colors)});"
				></div>
			</div>

			<div class="flex justify-between text-base">
				{#each style.legend.ranges as value, i (`${value}-${i}`)}
					{#if i === 0 || i === style.legend.ranges.length - 1}
						<span>{value} {style.legend.unit}</span>
					{/if}
				{/each}
			</div>
		</div>
	{:else if style.legend.type === 'image'}
		<ul class="flex flex-col gap-2 text-base">
			{#each style.legend.categories as category (`${category.name}-${category.urls.join('|')}`)}
				<h2 class="mt-4 text-base">{category.name}</h2>
				<div class="flex flex-col gap-2">
					{#each category.urls as url, j (`${category.labels[j] ?? url}-${url}`)}
						<li class="flex items-center gap-2">
							<div
								class="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-black bg-white p-2"
							>
								<img src={url} alt={category.labels[j]} class="aspect-square object-contain" />
							</div>
							<span class="text-sm">{category.labels[j]} </span>
						</li>
					{/each}
				</div>
			{/each}
		</ul>
	{/if}
</div>
