<script lang="ts">
	import Icon from '@iconify/svelte';

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
	import { openModelView } from '$routes/stores';
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

	const openSingleModelView = () => {
		if (!isThreeMeshEntry(layerEntry)) return;
		openModelView(layerEntry.id);
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
		<button
			class="c-btn-confirm mb-2 flex w-full items-center justify-center gap-2 rounded-lg p-2 text-sm"
			onclick={openSingleModelView}
		>
			<Icon icon="mdi:cube-scan" class="h-5 w-5" />
			モデルビューで開く
		</button>
		<MeshOption bind:layerEntry bind:showColorOption bind:showDimensionOption />
	{/if}
{/if}

<style>
</style>
