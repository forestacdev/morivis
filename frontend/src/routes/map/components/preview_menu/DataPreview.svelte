<script lang="ts">
	import { fly } from 'svelte/transition';

	// formatDescription.ts

	import { geoDataEntries } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { showDataMenu } from '$routes/stores';
	import { getLayerType } from '$routes/stores/layers';
	import { orderedLayerIds, groupedLayerStore, type LayerType } from '$routes/stores/layers';
	import { showNotification } from '$routes/stores/notification';

	let addedDataIds = $state<string[]>($orderedLayerIds);

	interface Props {
		showDataEntry: GeoDataEntry | null;
		tempLayerEntries: GeoDataEntry[];
	}

	let { showDataEntry = $bindable(), tempLayerEntries = $bindable() }: Props = $props();

	const addData = () => {
		if (showDataEntry) {
			const copy = { ...showDataEntry };
			showDataEntry = null;
			if (!geoDataEntries.some((entry) => entry.id === copy.id)) {
				tempLayerEntries = [...tempLayerEntries, copy];
			}

			const layerType = getLayerType(copy);

			groupedLayerStore.add(copy.id, layerType as LayerType);
			showNotification(`${copy.metaData.name}を追加しました`, 'success');
			showDataMenu.set(false);
		}
	};
	const deleteData = () => {
		if (showDataEntry) {
			groupedLayerStore.remove(showDataEntry.id);
			showDataEntry = null;
		}
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			showDataEntry = null;
		}
	};
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	transition:fly={{ duration: 200, y: 100, opacity: 0 }}
	class="pointer-events-none absolute bottom-4 z-10 flex w-full items-center justify-center gap-4 p-4"
>
	<button class="c-btn-cancel pointer-events-auto px-4 text-lg" onclick={deleteData}
		>キャンセル
	</button>
	{#if showDataEntry && !addedDataIds.includes(showDataEntry.id)}
		<button class="c-btn-confirm pointer-events-auto px-6 text-lg" onclick={addData}
			>地図に追加
		</button>
	{/if}
</div>

<style>
</style>
