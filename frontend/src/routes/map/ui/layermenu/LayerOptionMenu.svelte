<script lang="ts">
	import type { LayerEntry, LayerStyleColor } from '$routes/map/data/types';
	import { Style, type FillLayerSpecification } from 'maplibre-gl';
	import { demLayers } from '$routes/map/data/raster/dem';
	import Icon from '@iconify/svelte';
	export let layerDataEntries: LayerEntry[];
	import { showlayerOptionId, isSide, addedLayerIds } from '$routes/map/store/store';
	import { mapStore } from '$routes/map/store/map';
	import { fade, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { split } from 'postcss/lib/list';
	import ColorRamp from './ColorRamp.svelte';
	import { COLOR_MAP_TYPE } from '$routes/map/data/raster/dem';
	import type { ColorMapTypeKey } from '$routes/map/data/raster/dem';
	import { isMatchStyle, isSingleStyle, isInterpolateStyle } from '$routes/map/data/expression';
	import type {
		InterpolateColors,
		MatchColors,
		SingleColor,
		GeometryType
	} from '$routes/map/data/types';

	import FillOptionMenu from './LayerOptionMenu/FillOptionMenu.svelte';
	import LineOptionMenu from './LayerOptionMenu/LineOptionMenu.svelte';

	import { onMount } from 'svelte';

	isSide.subscribe((value) => {
		if (value !== 'layer') {
			showlayerOptionId.set('');
		}
	});

	type StyleKey = 'fill' | 'line' | 'circle' | 'symbol';

	// let layerOption: LayerEntry | undefined;
	const getStyleKey = (option: LayerEntry, type: StyleKey) => {
		if (!option || option.dataType === 'raster') return;
		return option?.style?.[type]?.styleKey;
	};

	$: layerOption = layerDataEntries.find(
		(layer) => layer.id === $showlayerOptionId
	) as LayerEntry;

	$: fillStyleKey = getStyleKey(layerOption, 'fill');
	$: lineStyleKey = getStyleKey(layerOption, 'line');
	$: symbolStyleKey = getStyleKey(layerOption, 'symbol');
	$: layerType = ((): 'fill' | 'line' | 'circle' | 'symbol' | undefined => {
		if (!layerOption) return;
		switch (layerOption.geometryType) {
			case 'polygon':
				return 'fill';
			case 'line':
				return 'line';
			case 'point':
				return 'circle';
			case 'label':
				return 'symbol';
			default:
				return;
		}
	})();

	// let categorieskeys = layerOption.style[layerType].color[styleKey].values.categories;

	// console.log('styleColor', styleColor);
	// レイヤーの削除
	const removeLayer = () => {
		if (!layerOption) return;
		addedLayerIds.removeLayer(layerOption.id);
		showlayerOptionId.set('');
	};

	// レイヤーの移動
	const moveLayerById = (direction: 'up' | 'down') => {
		if (!layerOption) return;
		const id = layerOption.id;

		addedLayerIds.reorderLayer(id, direction);
	};

	// レイヤーのフォーカス
	const focusLayer = () => {
		if (!layerOption) return;

		mapStore.focusLayer(layerOption.id);
	};

	const reloadDemTile = () => {
		mapStore.reloadDemTile();
	};

	const copyLayer = () => {
		if (!layerOption) return;
		const uuid = crypto.randomUUID();
		const copy: LayerEntry = {
			...layerOption,
			id: uuid
		};

		layerDataEntries.push(copy);
		addedLayerIds.addLayer(uuid);
	};

	onMount(() => {});
</script>

<div
	class="absolute left-[370px] flex h-full w-[200px] flex-col gap-2 rounded-sm bg-[#C27142] p-2 text-slate-100 shadow-2xl transition-all duration-200 {$showlayerOptionId
		? ''
		: 'pointer-events-none -translate-x-[100px] opacity-0'}"
>
	{#if $showlayerOptionId && layerOption}
		<div>
			<button class="" on:click={() => moveLayerById('up')}
				><Icon icon="bx:up-arrow" width="24" height="24" class="" />
			</button>
			<button class="" on:click={() => moveLayerById('down')}
				><Icon icon="bx:down-arrow" width="24" height="24" />
			</button>
			<button on:click={removeLayer}>
				<Icon icon="bx:trash" width="24" height="24" class="custom-anime" />
			</button>
			<button on:click={focusLayer}>
				<Icon icon="hugeicons:target-03" width="24" height="24" class="custom-anime" />
			</button>
			<button on:click={copyLayer}> コピーの作成 </button>
		</div>
		<div class="h-full">
			<div class="flex gap-2">
				<label class="block">表示</label>
				<input type="checkbox" class="custom-checkbox" bind:checked={layerOption.visible} />
			</div>
			<div class="flex flex-col gap-2">
				<label class="block">透過度</label>
				<input
					type="range"
					class="custom-slider"
					bind:value={layerOption.opacity}
					min="0"
					max="1"
					step="0.01"
				/>
			</div>
			{#if layerOption.dataType === 'vector' || layerOption.dataType === 'geojson'}
				{#if layerOption.style && layerType && layerOption.style[layerType]}
					{#if layerOption.style['symbol'] !== undefined}
						<div class="flex gap-2">
							<label class="block">ラベル</label>
							<input
								type="checkbox"
								class="custom-checkbox"
								bind:checked={layerOption.style['symbol'].show}
							/>
						</div>
					{/if}
					{#if layerOption.style['line'] !== undefined}
						<LineOptionMenu
							bind:lineStyle={layerOption.style['line']}
							bind:lineStyleKey
							{layerType}
						/>
					{/if}
					{#if layerOption.style['fill'] !== undefined}
						<FillOptionMenu
							bind:fillStyle={layerOption.style['fill']}
							bind:fillStyleKey
						/>
					{/if}
				{/if}
			{/if}

			{#if layerOption.dataType === 'raster'}
				<!-- TODO: -->
			{/if}
		</div>
		<!-- <div class="custom-scroll h-full overflow-y-auto">
			{#if layerOption.geometryType === 'polygon'}
				{#if expression.isExpression(getColorExpression(layerOption))}
					aaaaa
					{#each Object.entries(createSpeciesColors(getColorExpression(layerOption))) as [key, value]}
						<div class="flex w-full items-center">
							<div class="w-full text-sm">{key}</div>
							<label class="block">色</label>
							<input
								type="color"
								class="custom-color"
								{value}
								on:input={(e) => setColor(key, e.target.value)}
							/>
						</div>
					{/each}
				{/if}
			{/if}
		</div> -->
	{/if}
</div>

<style>
</style>
