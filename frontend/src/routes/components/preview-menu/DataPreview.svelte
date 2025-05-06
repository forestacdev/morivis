<script lang="ts">
	import { fly } from 'svelte/transition';

	// formatDescription.ts

	import type { GeoDataEntry } from '$routes/data/types';
	import { getLayerType } from '$routes/store/layers';
	import { orderedLayerIds, groupedLayerStore, type LayerType } from '$routes/store/layers';

	interface Props {
		showDataEntry: GeoDataEntry | null;
	}

	let { showDataEntry = $bindable() }: Props = $props();

	let layerType = $derived.by((): LayerType | unknown => {
		if (showDataEntry) {
			return getLayerType(showDataEntry);
		}
	});

	const addData = () => {
		if (showDataEntry) {
			groupedLayerStore.add(showDataEntry.id, layerType as LayerType);
			showDataEntry = null;
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
	<button class="c-btn-confirm pointer-events-auto px-6 text-lg" onclick={addData}
		>地図に追加
	</button>
</div>

<style>
</style>
