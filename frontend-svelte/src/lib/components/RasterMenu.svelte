<script lang="ts">
	import type { CategoryEntry } from '$lib/utils/layers';
	import Icon from '@iconify/svelte';
	import InfoPopup from '$lib/components/InfoPopup.svelte';
	import LayerSlot from '$lib/components/LayerMenu/LayerSlot.svelte';
	import type { LayerEntry } from '$lib/utils/layers';
	import { isSide } from '$lib/store/store';

	export let layerDataEntries: CategoryEntry[] = [];

	let selectedLayerEntry: LayerEntry | null = null;
	let selectedCategoryName: string | null = null;
</script>

<div
	class="bg-color-base absolute left-4 h-full overflow-visible rounded p-4 text-slate-100 shadow-2xl transition-all duration-200 {$isSide ===
	'raster'
		? ''
		: 'menu-out'}"
>
	<div class="flex flex-col gap-5">
		<div id="prefectures" class="flex flex-col gap-y-1">
			{#each layerDataEntries as categoryEntry (categoryEntry.categoryId)}
				<div class="mb-0 block text-sm font-semibold leading-6">
					{categoryEntry.categoryName}
				</div>
				<div class="layers flex flex-col gap-y-2">
					{#each categoryEntry.layers as layerEntry (layerEntry.id)}
						<LayerSlot bind:layerEntry />
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
</style>
