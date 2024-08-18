<script setup lang="ts">
	import type { LayerEntry } from '$lib/utils/layers';

	export let categoryName: string;
	export let layerEntry: LayerEntry;
</script>

<div class="p-3 max-w-md flex flex-col gap-4">
	<div class="flex flex-col gap-1.5">
		<h2 class="font-bold text-sm">{categoryName}: {layerEntry.name}</h2>
	</div>
	{#if layerEntry.remarks}
		<div>
			<p class="text-sm">{layerEntry.remarks}</p>
		</div>
	{/if}
</div>

<style>
</style>
