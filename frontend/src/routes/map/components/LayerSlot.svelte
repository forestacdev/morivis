<script lang="ts">
	import Icon from '@iconify/svelte';

	import type { GeoDataEntry } from '$map/data';
	import { addedLayerIds, showLayerOptionId } from '$map/store';

	let { layerEntry = $bindable() }: { layerEntry: GeoDataEntry } = $props();
</script>

<button
	id={layerEntry.id}
	class="w-full select-none flex-col justify-center bg-white p-2 text-left"
	onclick={() => showLayerOptionId.set(layerEntry.id)}
>
	<div class="flex justify-center gap-2">
		<input type="checkbox" bind:checked={layerEntry.style.visible} />
		<span>{layerEntry.metaData.name}</span>
	</div>

	<input type="range" bind:value={layerEntry.style.opacity} min="0" max="1" step="0.01" />
</button>

<style>
</style>
