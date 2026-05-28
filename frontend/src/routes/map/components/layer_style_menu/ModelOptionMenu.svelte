<script lang="ts">
	import MeshOption from './model_option/MeshOption.svelte';
	import PointCloudOption from './model_option/PoinbtCloudOption..svelte';

	import type {
		AnyModelEntry,
		ModelMeshEntry,
		MeshStyle,
		PointCloudStyleEntry
	} from '$routes/map/data/types/model';

	interface Props {
		layerEntry: AnyModelEntry;
		showColorOption: boolean;
		showDimensionOption: boolean;
	}

	let {
		layerEntry = $bindable(),
		showColorOption = $bindable(),
		showDimensionOption = $bindable()
	}: Props = $props();
</script>

{#if layerEntry && layerEntry.type === 'model'}
	{#if layerEntry.style.type === 'point-cloud'}
		<!-- Model options go here -->
		<PointCloudOption bind:layerEntry={layerEntry as PointCloudStyleEntry} bind:showColorOption />
	{/if}

	{#if layerEntry.style.type === 'mesh'}
		<!-- Model options go here -->
		<MeshOption
			bind:layerEntry={layerEntry as ModelMeshEntry<MeshStyle>}
			bind:showColorOption
			bind:showDimensionOption
		/>
	{/if}
{/if}

<style>
</style>
