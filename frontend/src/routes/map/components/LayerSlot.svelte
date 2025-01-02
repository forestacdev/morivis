<script lang="ts">
	import Icon from '@iconify/svelte';

	import type { GeoDataEntry } from '$map/data';
	import { addedLayerIds } from '$map/store';

	let { layerEntry = $bindable() }: { layerEntry: GeoDataEntry } = $props();
</script>

<button id={layerEntry.id} class="select-none flex-col justify-center p-2 text-left">
	{layerEntry.metaData.name}
</button>
<input type="checkbox" bind:checked={layerEntry.style.visible} />
<input type="range" bind:value={layerEntry.style.opacity} min="0" max="1" step="0.01" />

<style>
</style>
