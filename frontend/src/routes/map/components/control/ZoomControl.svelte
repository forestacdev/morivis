<script lang="ts">
	import Icon from '@iconify/svelte';
	import { gsap } from 'gsap';
	import { Draggable } from 'gsap/Draggable';
	import type {
		Map,
		MapMouseEvent,
		StyleSpecification,
		SourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker
	} from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { on } from 'svelte/events';

	import { mapStore } from '$routes/map/store/map';

	let container: HTMLElement;
	let value: number = $state(1);

	gsap.registerPlugin(Draggable);

	onMount(() => {
		if (!container) return;

		mapStore.onZoom((zoom) => {
			if (zoom) {
				value = zoom;
			}
		});
	});

	const setMapZoom = (e: Event) => {
		if (!e.target) return;
		const zoom = (e.target as HTMLInputElement).value;
		const map = mapStore.getMap();
		if (!map) return;
		map.setZoom(Number(zoom));
	};

	const zoomIn = () => {
		const map = mapStore.getMap();
		if (!map) return;
		map.zoomIn();
	};

	const zoomOut = () => {
		const map = mapStore.getMap();
		if (!map) return;
		map.zoomOut();
	};
</script>

<div
	bind:this={container}
	class="bg-main rounded-ful absolute right-0 top-0 flex h-[50px] w-[300px] origin-center translate-x-[100px] translate-y-[340px] -rotate-90 items-center justify-center gap-2 rounded-full px-[10px]"
>
	<button onclick={zoomOut} class="grid place-items-center">
		<Icon icon="typcn:minus" class=" h-8 w-8 rotate-[90deg] text-base" />
	</button>
	<input
		class="css-range block"
		type="range"
		min="1"
		max="22"
		step="0.01"
		bind:value
		oninput={(e) => setMapZoom(e)}
	/>
	<button onclick={zoomIn} class="grid place-items-center">
		<Icon icon="typcn:plus" class="h-8 w-8  text-base" />
	</button>
</div>

<style>
	/* スライダー */
	.css-range {
		-webkit-appearance: none;
		appearance: none;
		outline: none;
		cursor: pointer;
		width: 95%;
		height: 3px;
	}

	/* スライダー バー */
	.css-range::-webkit-slider-runnable-track {
		background: rgb(1, 44, 7);

		height: 8px;
		border-radius: 8px;
	}

	/* スライダー つまみ */
	.css-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		height: 18px;
		width: 18px;
		margin-top: -5px; /* 位置の調整が必要 */
		background-color: #ffffff;
		border-radius: 50%;
		border: 3px solid rgb(0, 0, 0);
		transition: all 0.15s;
	}
	.css-range::-webkit-slider-thumb:hover {
		background-color: #ffffff;
		border: 3px solid #47d400;
	}
</style>
