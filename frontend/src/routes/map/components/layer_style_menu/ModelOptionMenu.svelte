<script lang="ts">
	import GeoArrowOption from './model_option/GeoArrowOption.svelte';
	import MeshOption from './model_option/MeshOption.svelte';
	import PointCloudOption from './model_option/PoinbtCloudOption..svelte';

	import type {
		AnyModelEntry,
		ModelGeoArrowEntry,
		ModelMeshEntry,
		MeshStyle,
		PointCloudStyleEntry
	} from '$routes/map/data/types/model';
	import { mapStore } from '$routes/stores/map';

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

	$effect(() => {
		if (layerEntry.type !== 'model' || layerEntry.style.type !== 'mesh') return;
		$state.snapshot(layerEntry.style);
		mapStore.setModelStyle(layerEntry as ModelMeshEntry<MeshStyle>);
	});
</script>

{#if layerEntry && layerEntry.type === 'model'}
	{#if layerEntry.style.type === 'point-cloud'}
		<!-- Model options go here -->
		<PointCloudOption bind:layerEntry={layerEntry as PointCloudStyleEntry} bind:showColorOption />
	{/if}

	{#if layerEntry.style.type === 'geoarrow'}
		<GeoArrowOption bind:layerEntry={layerEntry as ModelGeoArrowEntry} bind:showColorOption />
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
