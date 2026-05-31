<script lang="ts">
	import type { DemRangeColorStyle } from '$routes/map/data/types/raster';
	import { generateDemLegend } from '$routes/map/utils/style/color-mapping';

	interface Props {
		style: DemRangeColorStyle;
	}

	let { style }: Props = $props();

	let legend = $derived.by(() => generateDemLegend(style));
</script>

{#each legend.categories as _, index}
	<div class="flex w-full items-center justify-center gap-2 text-base select-none">
		<div
			class="h-[20px] w-[20px] flex-none rounded-full"
			style="background-color: {legend.values[index]};"
		></div>
		<div class="w-full">{legend.categories[index]}</div>
	</div>
{/each}

<style>
</style>
