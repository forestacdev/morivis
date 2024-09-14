<script lang="ts">
	import type { LayerEntry } from '$lib/data/types';
	import Icon from '@iconify/svelte';
	export let layerDataEntries: LayerEntry[];
	import { showlayerOptionId, isSide, addedLayerIds } from '$lib/store/store';
	import { mapStore } from '$lib/store/map';
	import { fade, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import Geometries from 'three/src/renderers/common/Geometries.js';

	isSide.subscribe((value) => {
		if (value !== 'layer') {
			showlayerOptionId.set('');
		}
	});

	let layerOption: LayerEntry | undefined;
	$: layerOption = layerDataEntries.find((layer) => layer.id === $showlayerOptionId);

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
</script>

<div
	class="custom-css bg-color-base absolute left-[370px] flex w-[200px] rounded-sm p-2 text-slate-100 shadow-2xl transition-all duration-200 {$showlayerOptionId
		? ''
		: 'pointer-events-none -translate-x-[100px] opacity-0'}"
>
	{#if $showlayerOptionId && layerOption}
		<div>
			<button class="" on:click={() => moveLayerById('up')}
				><Icon icon="bx:up-arrow" width="24" height="24" class="" /></button
			>
			<button class="" on:click={() => moveLayerById('down')}
				><Icon icon="bx:down-arrow" width="24" height="24" /></button
			>
		</div>
		<div>
			<div class="flex gap-2">
				<label class="block">表示</label>
				<input type="checkbox" class="custom-checkbox" bind:checked={layerOption.visible} />
			</div>
			{#if layerOption.dataType === 'vector' || layerOption.dataType === 'geojson'}
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
				{#if layerOption.showLabel !== undefined}
					<div class="flex gap-2">
						<label class="block">ラベル</label>
						<input
							type="checkbox"
							class="custom-checkbox"
							bind:checked={layerOption.showLabel}
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
				{#if layerOption.geometryType === 'polygon'}
					<div class="flex flex-col gap-2">
						<select
							class="custom-select {!layerOption.showFill ? 'opacity-50' : ''}"
							bind:value={layerOption.styleKey}
							disabled={!layerOption.showFill}
						>
							{#each layerOption.style.fill as item (item)}
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
								bind:value={layerOption.style.fill[0].paint['fill-color']}
							/>
						</div>
					{/if}
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
			<button on:click={removeLayer}>
				<Icon icon="bx:trash" width="24" height="24" class="custom-anime" />
			</button>
			<button on:click={focusLayer}>
				<Icon icon="hugeicons:target-03" width="24" height="24" class="custom-anime" />
			</button>
		</div>
	{/if}
</div>

<style>
</style>
