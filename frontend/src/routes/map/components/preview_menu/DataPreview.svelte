<script lang="ts">
	import { fly } from 'svelte/transition';

	import { geoDataEntries } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { showDataMenu } from '$routes/stores';
	import { activeLayerIdsStore } from '$routes/stores/layers';
	import { showNotification } from '$routes/stores/notification';
	import { get } from 'svelte/store';
	import { getLayerType } from '$routes/map/utils/entries';

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
			if (!layerType) {
				showNotification(`レイヤータイプが不明です: ${copy.id}`, 'error');
				return;
			}
			activeLayerIdsStore.addType(copy.id, layerType);
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
	class="pointer-events-none absolute bottom-8 z-20 flex w-full items-center justify-center"
>
	<div class="flex flex-col gap-4 rounded-lg bg-black p-4">
		<span class="w-full text-center text-base">このデータを追加しますか？</span>
		<div class="flex gap-4">
			<button class="c-btn-sub pointer-events-auto px-4 text-lg" onclick={deleteData}
				>キャンセル
			</button>
			{#if showDataEntry}
				<button class="c-btn-confirm pointer-events-auto px-6 text-lg" onclick={addData}
					>地図に追加
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
</style>
