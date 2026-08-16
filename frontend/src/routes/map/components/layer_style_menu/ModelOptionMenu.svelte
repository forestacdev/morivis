<script lang="ts">
	import GeoArrowOption from './model_option/GeoArrowOption.svelte';
	import MeshOption from './model_option/MeshOption.svelte';
	import PointCloudOption from './model_option/PoinbtCloudOption..svelte';
	import Tiles3DMeshOption from './model_option/Tiles3DMeshOption.svelte';

	import type {
		MorivisModelEntry,
		DeckVectorEntry,
		MeshEntry,
		MeshStyle,
		Tiles3DMeshStyleEntry,
		PointCloudStyleEntry
	} from '$routes/map/data/types/model';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		layerEntry: MorivisModelEntry;
		showColorOption: boolean;
		showDimensionOption: boolean;
	}

	let {
		layerEntry = $bindable(),
		showColorOption = $bindable(),
		showDimensionOption = $bindable()
	}: Props = $props();

	const isThreeMeshEntry = (entry: MorivisModelEntry): entry is MeshEntry<MeshStyle> => {
		return entry.style.type === 'mesh' && entry.format.type !== '3d-tiles';
	};

	const isTiles3DMeshEntry = (entry: MorivisModelEntry): entry is Tiles3DMeshStyleEntry => {
		return entry.style.type === '3d-tiles-mesh';
	};

	$effect(() => {
		if (!isThreeMeshEntry(layerEntry)) return;
		$state.snapshot(layerEntry.style);
		mapStore.setModelStyle(layerEntry);
	});
</script>

{#if layerEntry && layerEntry.type === 'model'}
	{#if layerEntry.style.type === 'point-cloud'}
		<!-- Model options go here -->
		<PointCloudOption bind:layerEntry={layerEntry as PointCloudStyleEntry} bind:showColorOption />
	{/if}

	{#if layerEntry.style.type === 'geoarrow'}
		<GeoArrowOption bind:layerEntry={layerEntry as DeckVectorEntry} bind:showColorOption />
	{/if}

	{#if isTiles3DMeshEntry(layerEntry)}
		<Tiles3DMeshOption bind:layerEntry bind:showColorOption />
	{/if}

	{#if isThreeMeshEntry(layerEntry)}
		<!-- Model options go here -->
		<MeshOption bind:layerEntry bind:showColorOption bind:showDimensionOption />
	{/if}
{/if}

<style>
</style>
