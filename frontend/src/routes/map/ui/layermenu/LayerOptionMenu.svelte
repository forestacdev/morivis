<script lang="ts">
	import type { LayerEntry, LayerPaint } from '$routes/map/data/types';
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
	import type { InterpolateColors, MatchColors, SingleColor } from '$routes/map/data/types';

	import { onMount } from 'svelte';

	isSide.subscribe((value) => {
		if (value !== 'layer') {
			showlayerOptionId.set('');
		}
	});

	// let layerOption: LayerEntry | undefined;
	$: layerOption = layerDataEntries.find((layer) => layer.id === $showlayerOptionId);
	$: styleKey = layerOption?.styleKey;

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
				{#if layerOption.showSymbol !== undefined}
					<div class="flex gap-2">
						<label class="block">ラベル</label>
						<input
							type="checkbox"
							class="custom-checkbox"
							bind:checked={layerOption.showSymbol}
						/>
					</div>
				{/if}
				{#if layerOption.showLine !== undefined}
					<div class="flex gap-2">
						<label class="block">アウトライン</label>
						<input
							type="checkbox"
							class="custom-checkbox"
							bind:checked={layerOption.showLine}
						/>
					</div>
				{/if}
				{#if layerOption.showFill !== undefined}
					<div class="flex gap-2">
						<label class="block">塗りつぶし</label>
						<input
							type="checkbox"
							class="custom-checkbox"
							bind:checked={layerOption.showFill}
						/>
					</div>
				{/if}
				{#if layerOption.geometryType === 'polygon' && layerOption.style && layerOption.style.fill}
					<div class="flex flex-col gap-2">
						<select
							class="custom-select {!layerOption.showFill ? 'opacity-50' : ''}"
							bind:value={layerOption.styleKey}
							disabled={!layerOption.showFill}
						>
							{#each Object.keys(layerOption.style.fill) as item (item)}
								<option value={item}>{item}</option>
							{/each}
						</select>
					</div>
					<!-- {#if layerOption.styleKey === '単色'}
						<div class="flex gap-2">
							<label class="block">色</label>
							<input
								type="color"
								class="custom-color"
								bind:value={layerOption.style.fill['単色'].values.color}
							/>
						</div>
					{/if} -->
					{#if styleKey && isSingleStyle(layerOption.style.fill[styleKey])}
						<div class="flex gap-2">
							<label class="block">色</label>
							<input
								type="color"
								class="custom-color"
								bind:value={layerOption.style.fill[styleKey].values.color}
							/>
						</div>
					{:else if styleKey && isMatchStyle(layerOption.style.fill[styleKey])}
						{#each Object.entries(layerOption.style.fill[styleKey].values.categories) as [key, value]}
							<div class="flex w-full items-center">
								<div class="w-full text-sm">{key}</div>
								<input
									type="checkbox"
									value={key}
									bind:group={layerOption.style.fill[styleKey].values
										.showCategories}
								/>

								<input
									type="color"
									class="custom-color"
									bind:value={layerOption.style.fill[styleKey].values.categories[
										key
									]}
								/>
							</div>
						{/each}
					{:else if styleKey && isInterpolateStyle(layerOption.style.fill[styleKey])}{/if}
				{:else if layerOption.geometryType === 'line'}
					<div class="flex flex-col gap-2">
						<select class="custom-select" bind:value={layerOption.styleKey}>
							{#each layerOption.style.line as item (item)}
								<option value={item.name}>{item.name}</option>
							{/each}
						</select>
					</div>
					{#if layerOption.styleKey === '単色'}
						<div class="flex gap-2">
							<label class="block">色</label>
							<input
								type="color"
								class="custom-color"
								bind:value={layerOption.style.line[0].paint['line-color']}
							/>
						</div>
					{/if}
				{:else if layerOption.geometryType === 'point'}
					<div class="flex flex-col gap-2">
						<select class="custom-select" bind:value={layerOption.styleKey}>
							{#each layerOption.style.circle as item (item)}
								<option value={item.name}>{item.name}</option>
							{/each}
						</select>
					</div>
					{#if layerOption.styleKey === '単色'}
						<div class="flex gap-2">
							<label class="block">色</label>
							<input
								type="color"
								class="custom-color"
								bind:value={layerOption.style.circle[0].paint['circle-color']}
							/>
						</div>
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
