<script lang="ts">
	import type { CategoryEntry } from '$lib/utils/layers';
	import Icon from '@iconify/svelte';
	import type { LayerEntry } from '$lib/utils/layers';
	import { showlayerOptionId } from '$lib/store/store';

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let layerEntry: LayerEntry;
	let selectedStyle: string = layerEntry.style_key;
	const showLayerOption = () => {
		$showlayerOptionId === layerEntry.id
			? showlayerOptionId.set('')
			: showlayerOptionId.set(layerEntry.id);
	};

	// レイヤーの移動
	const moveLayerById = (direction: 'up' | 'down' | 'top' | 'bottom') => {
		const id = layerEntry.id;

		dispatch('moveLayerById', { id, direction });
	};

	const serPaintProperty = (key: string, value: string) => {
		console.log(key, value);
	};
</script>

<div
	class="relative flex select-none flex-col justify-between gap-x-2 transition-all delay-100 {$showlayerOptionId ===
	layerEntry.id
		? 'py-6'
		: ''}"
>
	<button
		class="absolute top-0 transition-all delay-100 duration-200 {$showlayerOptionId ===
		layerEntry.id
			? ''
			: 'pointer-events-none h-[0px] opacity-0'}"
		on:click={() => moveLayerById('up')}
		><Icon icon="bx:up-arrow" width="24" height="24" class="" /></button
	>
	<label
		class="w-full cursor-pointer items-end rounded-md bg-slate-400 p-2 transition-all duration-150 {layerEntry.visible
			? 'bg-color-active pb-10'
			: ''}"
	>
		<span class="">{layerEntry.name}</span>
		<input
			class="invisible"
			type="checkbox"
			id={layerEntry.name}
			bind:checked={layerEntry.visible}
			value={layerEntry}
		/>
		<!-- 透過度の設定 -->
		<div
			class="absolute flex gap-x-2 transition-all duration-150 {layerEntry.visible
				? 'max-h-[1000px]'
				: 'max-h-[0px] overflow-hidden border-transparent py-0 opacity-0'}"
		>
			<input
				type="range"
				class="my-2 w-full"
				bind:value={layerEntry.opacity}
				min="0"
				max="1"
				step="0.01"
			/>
			<button
				class="flex w-12 cursor-pointer items-center justify-center"
				on:click={showLayerOption}
			>
				<Icon
					icon="weui:setting-outlined"
					class="transition-all duration-150 {$showlayerOptionId === layerEntry.id
						? 'rotate-90'
						: ''}"
					width="24"
					height="24"
				/>
			</button>
		</div>
	</label>

	<div
		class="relative flex justify-between gap-2 bg-red-300 transition-all delay-100 duration-200 {$showlayerOptionId ===
		layerEntry.id
			? ''
			: ''}"
	>
		<button
			class="absolute left-0 transition-all delay-100 duration-200 {$showlayerOptionId ===
			layerEntry.id
				? ''
				: 'pointer-events-none opacity-0'}"
			on:click={() => moveLayerById('down')}
			><Icon icon="bx:down-arrow" class="absolute" width="24" height="24" /></button
		>
	</div>
</div>
<div
	class="absolute h-full w-full -translate-y-full rounded-md bg-white text-black transition-all duration-150 {$showlayerOptionId ===
	layerEntry.id
		? 'translate-x-[200px] opacity-100'
		: 'pointer-events-none scale-50 opacity-0'}"
>
	{#if layerEntry.show_label !== undefined}
		<div class="flex flex-col gap-2">
			<label class="block">ラベル</label>
			<input type="checkbox" bind:checked={layerEntry.show_label} />
		</div>
	{/if}

	{#if layerEntry.type === 'raster'}
		<div class="flex flex-col gap-2">
			<label class="block">透過度</label>
			<input
				type="range"
				class="w-full"
				on:input={() => console.log('change')}
				min="0"
				max="1"
				step="0.01"
			/>
			<label class="block">raster-saturation</label>
			<input
				type="range"
				class="w-full"
				on:input={(event) => serPaintProperty('raster-saturation', event.target.value)}
				min="0"
				max="1"
				step="0.01"
			/>
		</div>
	{:else if layerEntry.type === 'geojson-polygon'}
		<div class="flex flex-col gap-2">
			<select bind:value={layerEntry.style_key}>
				{#each layerEntry.style.fill as item (item)}
					<option value={item.name}>{item.name}</option>
				{/each}
			</select>
		</div>
	{/if}
</div>

<style>
</style>
