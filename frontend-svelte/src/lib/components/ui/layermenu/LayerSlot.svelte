<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { LayerEntry } from '$lib/data/types';
	import { showlayerOptionId, addedLayerIds } from '$lib/store/store';
	import { flip } from 'svelte/animate';
	import { crossfade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { BASEMAP_IMAGE_TILE } from '$lib/constants';
	import { mapStore } from '$lib/store/map';

	import { createEventDispatcher } from 'svelte';
	import { rasterEntries } from '$lib/data/raster';
	const dispatch = createEventDispatcher();

	export let layerEntry: LayerEntry;
	export let index: number;
	export let clickedLayerId: string;
	let selectedStyle: string = layerEntry.styleKey;
	const showLayerOption = () => {
		$showlayerOptionId === layerEntry.id
			? showlayerOptionId.set('')
			: showlayerOptionId.set(layerEntry.id);
	};

	$: {
		if ($showlayerOptionId === layerEntry.id && !layerEntry.visible) {
			// showlayerOptionId.set('');
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

	// NOTE
	// const focusLayer = (event: Event) => {
	// 	event.stopPropagation();
	// 	if (!layerEntry) return;

	// 	mapStore.focusLayer(layerEntry.id);
	// };
</script>

<button
	id={layerEntry.id}
	class="items-centergap-x-2 relative mr-[40px] flex w-[220px] select-none flex-col justify-center rounded-sm transition-all {$showlayerOptionId ===
	layerEntry.id
		? 'translate-x-[15px]'
		: ''}"
	in:receive={{ key: layerEntry.id }}
	out:send={{ key: layerEntry.id }}
	on:click={showLayerOption}
>
	<div
		class="absolute z-10 grid h-[60px] w-[60px] place-items-center overflow-hidden rounded-full text-[#012a2d] {$showlayerOptionId ===
		layerEntry.id
			? ''
			: ''}"
		style="background-image: radial-gradient(#f2f2f2 50%, transparent 56%),
			conic-gradient(#f0ab56 0% {layerEntry.opacity * 100}%, #7d7d7d {layerEntry.opacity * 100}% 100%);"
	>
		{#if layerEntry.geometryType === 'point'}
			<Icon icon="carbon:circle-filled" class="pointer-events-none" width={30} />
		{:else if layerEntry.geometryType === 'line'}
			<Icon icon="tabler:line" class="pointer-events-none" width={30} />
		{:else if layerEntry.geometryType === 'polygon'}
			<Icon icon="ph:polygon" class="pointer-events-none" width={30} />
		{:else if layerEntry.geometryType === 'raster'}
			<img
				class="pointer-events-none block h-[60%] w-[60%] rounded-full object-cover"
				alt={layerEntry.name}
				src={layerEntry.url
					.replace('{z}', BASEMAP_IMAGE_TILE.Z.toString())
					.replace('{x}', BASEMAP_IMAGE_TILE.X.toString())
					.replace('{y}', BASEMAP_IMAGE_TILE.Y.toString())}
			/>
		{/if}
	</div>
	<div
		class="custom-bg absolute bottom-[10px] z-0 h-[70%] w-full bg-black"
		style="transform: skewX(-10deg);"
	></div>
	<span class="absolute bottom-[4px] left-[5px] z-10 rounded-md bg-slate-400 text-xs"
		>{layerEntry.opacity.toFixed(2)}</span
	>
	<div class="z-10 ml-[70px] w-full py-4">
		<div class="w-full cursor-pointer items-end text-left transition-all duration-150">
			<span class="flex items-center gap-2">{layerEntry.name}</span>
		</div>
		<div class="flex items-center gap-2 text-xs">
			<Icon icon="gg:pin" /><span class="">{layerEntry.location ?? '---'}</span>
		</div>
	</div>
</button>

<style>
	.custom-button {
		/* transform: skewX(-10deg); */
	}

	.custom-bg {
		background: rgb(0, 0, 0);
		background: linear-gradient(270deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%);
	}

	/* .custom-button::before {
		content: 'っs';
		position: absolute;

		width: 100%;
		height: 100%;
		right: 10px;
		bottom: 10px;
		background: #000;
		z-index: 0;
	} */
</style>
