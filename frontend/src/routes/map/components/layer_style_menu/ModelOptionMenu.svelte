<script lang="ts">
	import Icon from '@iconify/svelte';

	import GaussianSplatOption from './model_option/GaussianSplatOption.svelte';
	import GeoArrowOption from './model_option/GeoArrowOption.svelte';
	import MeshOption from './model_option/MeshOption.svelte';
	import PointCloudOption from './model_option/PoinbtCloudOption..svelte';
	import Tiles3DMeshOption from './model_option/Tiles3DMeshOption.svelte';

	import type {
		MorivisModelEntry,
		DeckVectorEntry,
		GaussianSplatEntry,
		MeshEntry,
		MeshStyle,
		ThreeModelEntry,
		Tiles3DMeshStyleEntry,
		PointCloudStyleEntry
	} from '$routes/map/data/types/model';
	import { closeModelView, modelViewRequest, openModelView } from '$routes/stores';
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

	const isThreeModelEntry = (entry: MorivisModelEntry): entry is ThreeModelEntry => {
		return isThreeMeshEntry(entry) || entry.style.type === 'gaussian-splat';
	};

	const isTiles3DMeshEntry = (entry: MorivisModelEntry): entry is Tiles3DMeshStyleEntry => {
		return entry.style.type === '3d-tiles-mesh';
	};
	const isCurrentModelView = $derived(
		isThreeModelEntry(layerEntry) &&
			$modelViewRequest?.entryIds.length === 1 &&
			$modelViewRequest.entryIds[0] === layerEntry.id
	);

	const openSingleModelView = () => {
		if (!isThreeModelEntry(layerEntry)) return;
		if (isCurrentModelView) {
			closeModelView();
			return;
		}
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

	{#if isThreeModelEntry(layerEntry)}
		<div class="px-4 py-3">
			<button
				class="c-btn-confirm flex w-full items-center justify-center gap-2 p-2 text-sm rounded-full"
				onclick={openSingleModelView}
			>
				<Icon
					icon={isCurrentModelView ? 'material-symbols:close-rounded' : 'mdi:cube-scan'}
					class="h-5 w-5"
				/>
				{isCurrentModelView ? 'モデルビューを閉じる' : 'モデルビューで開く'}
			</button>
		</div>
		{#if isThreeMeshEntry(layerEntry)}
			<MeshOption bind:layerEntry bind:showColorOption bind:showDimensionOption />
		{:else}
			<GaussianSplatOption
				bind:layerEntry={layerEntry as GaussianSplatEntry}
				bind:showColorOption
			/>
		{/if}
	{/if}
{/if}

<style>
</style>
