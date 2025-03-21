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
	class="bg-main rounded-ful absolute right-0 top-[90px] flex h-[50px] w-[300px] origin-center items-center justify-center gap-2 rounded-full px-[10px]"
>
	<button onclick={zoomOut} class="grid place-items-center">
		<Icon icon="typcn:minus" class=" h-8 w-8 text-base" />
	</button>

	<button onclick={zoomIn} class="grid place-items-center">
		<Icon icon="typcn:plus" class="h-8 w-8  text-base" />
	</button>
</div>

<style>
</style>
