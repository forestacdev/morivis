<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	import RangeSlider from '$map/components/atoms/RangeSlider.svelte';
	import RasterOptionMenu from '$map/components/LayerOptionMenu/RasterOptionMenu.svelte';
	import VectorOptionMenu from '$map/components/LayerOptionMenu/VectorOptionMenu.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import { showLayerOptionId, addedLayerIds } from '$map/store';
	import { mapStore } from '$map/store/map';

	let {
		layerToEdit = $bindable(),
		tempLayerEntries = $bindable()
	}: { layerToEdit: GeoDataEntry | undefined; tempLayerEntries: GeoDataEntry[] } = $props();

	// レイヤーの削除
	const removeLayer = () => {
		if (!layerToEdit) return;
		addedLayerIds.removeLayer(layerToEdit.id);
		showLayerOptionId.set('');
	};

	// レイヤーの移動
	const moveLayerById = (direction: 'up' | 'down') => {
		if (!layerToEdit) return;
		const id = layerToEdit.id;
		addedLayerIds.reorderLayer(id, direction);
	};

	// レイヤーのフォーカス
	const focusLayer = () => {
		if (!layerToEdit) return;
		mapStore.focusLayer(layerToEdit);
	};

	// レイヤーのコピー
	const copyLayer = () => {
		if (!layerToEdit) return;
		const uuid = crypto.randomUUID();
		const copy: GeoDataEntry = JSON.parse(JSON.stringify(layerToEdit)); // 深いコピーを作成

		copy.id = uuid;
		copy.metaData.name = `${layerToEdit.metaData.name} (コピー)`;

		tempLayerEntries = [...tempLayerEntries, copy];
		addedLayerIds.addLayer(uuid);
	};

	onMount(() => {});
</script>

{#if $showLayerOptionId}
	<div
		class="bg-main absolute left-[350px] top-2 z-10 flex h-[400px] w-[300px] flex-col gap-2 overflow-hidden rounded-lg p-2 shadow-2xl"
	>
		{#if $showLayerOptionId && layerToEdit}
			<span class="text-lg">{layerToEdit.metaData.name}</span>
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
					<button onclick={focusLayer}>
						<Icon icon="hugeicons:target-03" width="24" height="24" class="custom-anime" />
					</button>
					<button onclick={copyLayer}> コピーの作成 </button>
				</div>
				<div class="h-full flex-grow overflow-x-hidden overscroll-y-auto">
					{#if layerToEdit.type === 'vector'}
						<VectorOptionMenu bind:layerToEdit />
					{/if}

					{#if layerToEdit.type === 'raster'}
						<RasterOptionMenu bind:layerToEdit />
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<div
		class="bg-main absolute left-[700px] top-2 z-10 flex h-[400px] w-[300px] flex-col gap-2 overflow-hidden rounded-lg p-2 shadow-2xl"
	>
		いろわけあのやつ
	</div>
{/if}

<style>
</style>
