<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { LayerEntry } from '$routes/map/data/types';
	import { showlayerOptionId, addedLayerIds } from '$routes/map/store/store';
	import { flip } from 'svelte/animate';
	import { crossfade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { BASEMAP_IMAGE_TILE } from '$routes/map/constants';
	import { mapStore } from '$routes/map/store/map';

	import { createEventDispatcher } from 'svelte';
	import { rasterEntries } from '$routes/map/data/raster';
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
	class="relative mr-[40px] flex w-[220px] select-none flex-col justify-center rounded-sm transition-all"
	in:receive={{ key: layerEntry.id }}
	out:send={{ key: layerEntry.id }}
	on:click={showLayerOption}
>
	<div
		class="absolute z-10 grid h-[45px] w-[45px] place-items-center overflow-hidden rounded-full text-[#012a2d] transition-all {$showlayerOptionId ===
		layerEntry.id
			? 'translate-x-[170px]'
			: ''}"
		style="background-image: radial-gradient(#f2f2f2 50%, transparent 56%),
			conic-gradient(#00b0e0 0% {layerEntry.opacity * 100}%, transparent {layerEntry.opacity *
			100}% 100%);"
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
					.replace(
						'{z}',
						layerEntry.tileImage
							? layerEntry.tileImage.z.toString()
							: BASEMAP_IMAGE_TILE.Z.toString()
					)
					.replace(
						'{x}',
						layerEntry.tileImage
							? layerEntry.tileImage.x.toString()
							: BASEMAP_IMAGE_TILE.X.toString()
					)
					.replace(
						'{y}',
						layerEntry.tileImage
							? layerEntry.tileImage.y.toString()
							: BASEMAP_IMAGE_TILE.Y.toString()
					)}
			/>
		{/if}
	</div>
	<div class="custom-np absolute bottom-[10px] z-0 h-[70%] w-full"></div>
	<!-- <span class="absolute bottom-[4px] left-[5px] z-10 rounded-md bg-slate-400 text-xs"
		>{layerEntry.opacity.toFixed(2)}</span
	> -->
	<div
		class="z-10 ml-[70px] w-full py-4 transition-all {$showlayerOptionId === layerEntry.id
			? '-translate-x-[50px]'
			: ''}"
	>
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

	.custom-np {
		border-radius: 50px;
		background: #6ba05d;
		box-shadow:
			inset 20px 20px 30px #5b884f,
			inset -20px -20px 30px #7bb86b;
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
