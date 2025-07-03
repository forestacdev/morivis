<script lang="ts">
	import { fly } from 'svelte/transition';

	import { geoDataEntries } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { showDataMenu } from '$routes/stores';
	import { activeLayerIdsStore } from '$routes/stores/layers';
	import { showNotification } from '$routes/stores/notification';

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

			activeLayerIdsStore.add(copy.id);
			showNotification(`${copy.metaData.name}を追加しました`, 'success');
			showDataMenu.set(false);
		}
	};
	const deleteData = () => {
		if (showDataEntry) {
			activeLayerIdsStore.remove(showDataEntry.id);
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
	{#if showDataEntry && activeLayerIdsStore.has(showDataEntry.id)}
		<button class="c-btn-confirm pointer-events-auto px-6 text-lg" onclick={addData}
			>地図に追加
		</button>
	{/if}
</div>

<style>
</style>
