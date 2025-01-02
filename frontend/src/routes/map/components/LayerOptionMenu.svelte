<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';

	// import CircleOptionMenu from './_ui/layermenu/LayerOptionMenu/CircleOptionMenu.svelte';
	// import FillOptionMenu from './_ui/layermenu/LayerOptionMenu/FillOptionMenu.svelte';
	// import LineOptionMenu from './_ui/layermenu/LayerOptionMenu/LineOptionMenu.svelte';

	import type { GeoDataEntry } from '$map/data';
	import { showLayerOptionId, isSide, addedLayerIds } from '$map/store';
	import { mapStore } from '$map/store/map';

	let { layerToEdit = $bindable() }: { layerToEdit: GeoDataEntry | undefined } = $props();

	isSide.subscribe((value) => {
		if (value !== 'layer') {
			showLayerOptionId.set('');
		}
	});

	type StyleKey = 'fill' | 'line' | 'circle' | 'symbol';

	// let layerOption: LayerEntry | undefined;
	const getStyleKey = (option: LayerEntry, type: StyleKey) => {
		if (!option || option.dataType === 'raster') return;
		return option?.style?.[type]?.styleKey;
	};

	// let categorieskeys = layerOption.style[layerType].color[styleKey].values.categories;

	// console.log('styleColor', styleColor);
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

		mapStore.focusLayer(layerToEdit.id);
	};

	const copyLayer = () => {
		if (!layerToEdit) return;
		const uuid = crypto.randomUUID();
		const copy: GeoDataEntry = JSON.parse(JSON.stringify(layerToEdit)); // 深いコピーを作成

		copy.id = uuid;
		copy.metaData.name = `${layerToEdit.metaData.name} (コピー)`;

		// tempLayerEntries = [...tempLayerEntries, copy];
		// addedLayerIds.addLayer(uuid);
	};

	onMount(() => {});
</script>

{#if $showLayerOptionId}
	{layerToEdit}
	<div
		class="absolute left-[270px] z-10 flex h-[400px] w-[300px] flex-col gap-2 rounded-sm bg-[#C27142] p-2 text-slate-100 shadow-2xl"
	>
		<span class="text-lg">レイヤーオプション</span>
		<div class="h-full flex-grow overflow-y-auto">
			{#if $showLayerOptionId && layerToEdit}
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
				<div class="h-full flex-grow overscroll-y-auto"></div>
			{/if}
		</div>
	</div>
{/if}

<style>
</style>
