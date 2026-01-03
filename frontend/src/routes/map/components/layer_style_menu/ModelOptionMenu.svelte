<script lang="ts">
	import type {
		AnyModelEntry,
		MeshStyleEntry,
		PointCloudStyleEntry
	} from '$routes/map/data/types/model';
	import MeshOption from './model_option/MeshOption.svelte';
	import PointCloudOption from './model_option/PoinbtCloudOption..svelte';

	interface Props {
		layerEntry: AnyModelEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();
</script>

{#if layerEntry && layerEntry.type === 'model'}
	{#if layerEntry.style.type === 'point-cloud'}
		<!-- Model options go here -->
		<PointCloudOption bind:layerEntry={layerEntry as PointCloudStyleEntry} bind:showColorOption />
	{/if}

	{#if layerEntry.style.type === 'mesh'}
		<!-- Model options go here -->
		<MeshOption bind:layerEntry={layerEntry as MeshStyleEntry} bind:showColorOption />
	{/if}
{/if}

<style>
</style>
