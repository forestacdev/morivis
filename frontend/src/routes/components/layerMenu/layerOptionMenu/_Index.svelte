<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import RasterOptionMenu from '$routes/components/layerMenu/layerOptionMenu/RasterOptionMenu.svelte';
	import VectorOptionMenu from '$routes/components/layerMenu/layerOptionMenu/VectorOptionMenu.svelte';
	import LayerSlot from '$routes/components/layerMenu/LayerSlot.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import { selectedLayerId, addedLayerIds, isEdit } from '$routes/store';
	import { mapStore } from '$routes/store/map';

	let {
		layerToEdit = $bindable(),
		tempLayerEntries = $bindable()
	}: { layerToEdit: GeoDataEntry | undefined; tempLayerEntries: GeoDataEntry[] } = $props();

	// レイヤーの削除
	const removeLayer = () => {
		$isEdit = false;
		if (!layerToEdit) return;
		addedLayerIds.removeLayer(layerToEdit.id);
		selectedLayerId.set('');
	};

	// レイヤーの移動
	const moveLayerById = (direction: 'up' | 'down') => {
		if (!layerToEdit) return;
		const id = layerToEdit.id;
		addedLayerIds.reorderLayer(id, direction);
	};

	// レイヤーのフォーカス
	// const focusLayer = () => {
	// 	if (!layerToEdit) return;
	// 	mapStore.focusLayer(layerToEdit);
	// };

	// レイヤーのコピー
	const copyLayer = () => {
		if (!layerToEdit) return;
		$isEdit = false;
		const uuid = crypto.randomUUID();
		const copy: GeoDataEntry = JSON.parse(JSON.stringify(layerToEdit)); // 深いコピーを作成

		copy.id = uuid;
		copy.metaData.name = `${layerToEdit.metaData.name} (コピー)`;

		tempLayerEntries = [...tempLayerEntries, copy];
		addedLayerIds.addLayer(uuid);
	};

	// レイヤーのフォーカス
	selectedLayerId.subscribe((id) => {
		if (id && layerToEdit) {
			mapStore.focusLayer(layerToEdit);
			return;
		}
	});

	onMount(() => {});
</script>

{#if $selectedLayerId && $isEdit && layerToEdit}
	<div
		transition:fly={{ duration: 300, y: -50, opacity: 0 }}
		class="bg-main absolute top-0 z-30 flex h-full w-full flex-col p-2"
	>
		<LayerSlot bind:layerEntry={layerToEdit} />
		<div class="flex h-full w-full flex-col gap-2 overflow-hidden">
			<div class="h-full flex-grow">
				<div class="flex gap-2">
					<button class="" onclick={() => moveLayerById('up')}
						><Icon icon="bx:up-arrow" width="24" height="24" class="" />
					</button>
					<button class="" onclick={() => moveLayerById('down')}
						><Icon icon="bx:down-arrow" width="24" height="24" />
					</button>
					<button onclick={removeLayer}>
						<Icon icon="bx:trash" width="24" height="24" class="custom-anime" />
					</button>
					<button>
						<Icon icon="hugeicons:target-03" width="24" height="24" class="custom-anime" />
					</button>
					<button onclick={copyLayer}> コピーの作成 </button>
				</div>
				<div class="h-full flex-grow overflow-x-hidden">
					{#if layerToEdit.type === 'vector'}
						<VectorOptionMenu bind:layerToEdit />
					{/if}

					{#if layerToEdit.type === 'raster'}
						<RasterOptionMenu bind:layerToEdit />
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
</style>
