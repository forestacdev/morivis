<script lang="ts">
	import type { CategoryEntry } from '$lib/data/layers';
	import Icon from '@iconify/svelte';
	import type { LayerEntry } from '$lib/data/types';
	import { showlayerOptionId } from '$lib/store/store';
	import { flip } from 'svelte/animate';
	import { crossfade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let layerEntry: LayerEntry;
	export let index: number;
	let selectedStyle: string = layerEntry.styleKey;
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

	$: {
		if ($showlayerOptionId === layerEntry.id && !layerEntry.visible) {
			showlayerOptionId.set('');
		}
	}

	export const [send, receive] = crossfade({
		duration: (d) => Math.sqrt(d * 200),

		fallback(node, params) {
			const style = getComputedStyle(node);
			const transform = style.transform === 'none' ? '' : style.transform;

			return {
				duration: 600,
				easing: quintOut,
				css: (t) => `
				transform: ${transform} scale(${t});
				opacity: ${t}
			`
			};
		}
	});
</script>

<div
	class="relative flex select-none flex-col justify-between gap-x-2 rounded-sm border-[1px] border-slate-50 transition-all {$showlayerOptionId ===
	layerEntry.id
		? '!rounded-sm py-6 delay-100'
		: ''}"
	class:bg-color-active={$showlayerOptionId === layerEntry.id || layerEntry.visible}
	class:py-6={$showlayerOptionId === layerEntry.id}
	class:slot-active-anime={layerEntry.visible}
	class:slot-inactive-anime={!layerEntry.visible}
	in:receive={{ key: layerEntry.id }}
	out:send={{ key: layerEntry.id }}
>
	<button
		class="absolute top-0 transition-all delay-100 duration-200 {$showlayerOptionId ===
		layerEntry.id
			? ''
			: 'pointer-events-none opacity-0'}"
		on:click={() => moveLayerById('up')}
		><Icon icon="bx:up-arrow" width="24" height="24" class="" /></button
	>

	<div class="relative flex justify-between">
		<label class="w-full cursor-pointer items-end p-2 transition-all duration-150">
			<span class="">{layerEntry.name}</span>
			<input
				class="invisible"
				type="checkbox"
				id={layerEntry.name}
				bind:checked={layerEntry.visible}
				value={layerEntry}
			/>

			<!-- 透過度の設定 -->
		</label>
		<button
			class="absolute right-1 top-2 flex w-12 cursor-pointer items-center justify-center {layerEntry.visible
				? ''
				: 'pointer-events-none overflow-hidden border-transparent py-0 opacity-0'}"
			on:click={showLayerOption}
		>
			<Icon
				class="transition-all duration-150 {$showlayerOptionId === layerEntry.id
					? 'rotate-90'
					: ''}"
				icon="weui:setting-outlined"
				width="24"
				height="24"
			/>
		</button>
	</div>
	<button
		class="absolute bottom-7 transition-all delay-100 duration-200 {$showlayerOptionId ===
		layerEntry.id
			? ''
			: 'pointer-events-none opacity-0'}"
		on:click={() => moveLayerById('down')}
		><Icon icon="bx:down-arrow" class="absolute" width="24" height="24" /></button
	>
</div>

<style>
	/* :root {
		--active-width: 200px;
		--inactive-width: 150px;
	}
	.slot-active-anime {
		animation: slot-active 0.2s forwards;
		width: var(--inactive-width);
	}
	@keyframes slot-active {
		100% {
			width: var(--active-width);
		}
	}

	.slot-inactive-anime {
		width: var(--active-width);
		animation: slot-inactive 0.2s forwards;
	}

	@keyframes slot-inactive {
		100% {
			width: var(--inactive-width);
		}
	} */
</style>
