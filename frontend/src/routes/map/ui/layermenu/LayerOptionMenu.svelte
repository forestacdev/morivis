<script lang="ts">
	import type { LayerEntry, LayerStyleColor } from '$routes/map/data/types';
	import { Style, type FillLayerSpecification } from 'maplibre-gl';
	import { demLayers } from '$routes/map/data/raster/dem';
	import Icon from '@iconify/svelte';
	export let layerDataEntries: LayerEntry[];
	export let tempLayerEntries: LayerEntry[];
	import { showlayerOptionId, isSide, addedLayerIds } from '$routes/map/store/store';
	import { mapStore } from '$routes/map/store/map';
	import { fade, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
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
	import CircleOptionMenu from './LayerOptionMenu/CircleOptionMenu.svelte';
	import RangeSlider from '$routes/map/ui/atoms/RangeSlider.svelte';
	import CheckBox from '$routes/map/ui/atoms/CheckBox.svelte';

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
	$: circleStyleKey = getStyleKey(layerOption, 'circle');
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
		const copy: LayerEntry = JSON.parse(JSON.stringify(layerOption)); // 深いコピーを作成

		copy.id = uuid;
		copy.name = `${layerOption.name} (コピー)`;

		tempLayerEntries = [...tempLayerEntries, copy];
		addedLayerIds.addLayer(uuid);
	};

	onMount(() => {});
</script>

{#if $showlayerOptionId}
	<div
		class="absolute left-[370px] flex h-[400px] w-[300px] flex-col gap-2 rounded-sm bg-[#C27142] p-2 text-slate-100 shadow-2xl"
	>
		<span class="text-lg">レイヤーオプション</span>
		<div class="h-full flex-grow overflow-y-auto">
			{#if $showlayerOptionId && layerOption}
				<div class="flex gap-2">
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
						<Icon
							icon="hugeicons:target-03"
							width="24"
							height="24"
							class="custom-anime"
						/>
					</button>
					<button on:click={copyLayer}> コピーの作成 </button>
				</div>
				<div class="h-full flex-grow overscroll-y-auto">
					<CheckBox label="表示" bind:value={layerOption.visible} />
					<RangeSlider label="透過度" bind:value={layerOption.opacity} />
					{#if layerOption.dataType === 'vector' || layerOption.dataType === 'geojson'}
						{#if layerOption.style && layerType && layerOption.style[layerType]}
							{#if layerOption.style['symbol'] !== undefined}
								<div class="flex gap-2">
									<label class="">ラベル</label>
									<input
										type="checkbox"
										class="custom-checkbox"
										bind:checked={layerOption.style['symbol'].show}
									/>
								</div>
							{/if}
							{#if layerOption.style['circle'] !== undefined}
								<CircleOptionMenu
									bind:circleStyle={layerOption.style['circle']}
									bind:circleStyleKey
									{layerType}
								/>
							{/if}
							{#if layerOption.style['line'] !== undefined}
								<LineOptionMenu
									bind:lineStyle={layerOption.style['line']}
									bind:lineStyleKey
									{layerType}
								/>
							{/if}
							{#if layerOption.style['fill'] !== undefined && fillStyleKey}
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
			{/if}
		</div>
	</div>
{/if}

<style>
</style>
