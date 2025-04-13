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

	import { mapStore } from '$routes/store/map';

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
	class="bg-main rounded-ful flex origin-center flex-col items-center justify-center gap-2 rounded-full px-[10px] py-4"
>
	<button onclick={zoomIn} class="grid place-items-center">
		<Icon icon="typcn:plus" class="h-6 w-6  text-base" />
	</button>

	<div class="w-full border-[1px] border-gray-300"></div>
	<button onclick={zoomOut} class="grid place-items-center">
		<Icon icon="typcn:minus" class=" h-6 w-6 text-base" />
	</button>
</div>

<style>
</style>
