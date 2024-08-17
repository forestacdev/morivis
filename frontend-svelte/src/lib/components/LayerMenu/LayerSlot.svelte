<script lang="ts">
	import type { CategoryEntry } from '$lib/utils/layers';
	import Icon from '@iconify/svelte';
	import type { LayerEntry } from '$lib/utils/layers';
	import { showlayerOptionId } from '$lib/store/store';

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let layerEntry: LayerEntry;
	const showLayerOption = () => {
		$showlayerOptionId === layerEntry.id
			? showlayerOptionId.set('')
			: showlayerOptionId.set(layerEntry.id);
	};

	// $: if (layerEntry) {
	// 	showlayerOptionId.set('');
	// }

	const moveLayerById = (direction: 'up' | 'down') => {
		const id = layerEntry.id;
		console.log(id);

		dispatch('moveLayerById', { id, direction });
	};
</script>

<div class="relative flex select-none flex-col justify-between gap-x-2">
	<button
		class="transition-all duration-200 {$showlayerOptionId === layerEntry.id
			? 'max-h-[100px]'
			: 'max-h-[0px]'}"
		on:click={() => moveLayerById('up')}>ss</button
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
		class="absolute right-0 h-[100px] rounded-md bg-white text-black transition-all duration-150 {$showlayerOptionId ===
		layerEntry.id
			? 'translate-x-[70px] opacity-100'
			: 'pointer-events-none scale-50 opacity-0'}"
	>
		ss
	</div>
	<button
		class="transition-all duration-200 {$showlayerOptionId === layerEntry.id
			? 'max-h-[100px]'
			: 'max-h-[0px]'}"
		on:click={() => moveLayerById('down')}>down</button
	>
</div>

<style>
</style>
