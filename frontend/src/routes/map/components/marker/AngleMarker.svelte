<script lang="ts">
	import type { LngLat } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';

	interface Props {
		map: maplibregl.Map;
		lngLat: LngLat;
		show: boolean;
		rotation: number; // Optional rotation property
	}
	let { lngLat = $bindable(), map, show = $bindable(), rotation = $bindable() }: Props = $props();
	let container = $state<HTMLElement | null>(null);
	let marker: maplibregl.Marker | null = $state.raw(null);

	$effect(() => {
		if (!show) {
			if (marker) {
				marker.remove();
				marker = null;
			}
		} else {
			marker = new maplibregl.Marker({
				element: container,
				pitchAlignment: 'map',
				rotationAlignment: 'map',
				anchor: 'center',
				draggable: true
			})
				.setLngLat(lngLat)
				.setRotation(-rotation + 180)
				.addTo(map);
		}
	});

	// マーカーの回転
	$effect(() => {
		if (rotation && marker) {
			const r = -rotation + 180;
			marker.setRotation(r);
		}
	});

	$effect(() => {
		if (lngLat && marker) {
			marker.setLngLat(lngLat);
		}
	});

	onDestroy(() => {
		marker?.remove();
	});
</script>

<div
	bind:this={container}
	class="pointer-events-none relative grid h-[100px] w-[100px] place-items-center {show
		? ''
		: 'hidden'}"
>
	<div class="c-player-marker z-50 grid scale-75 place-items-center">
		<svg xmlns="http://www.w3.org/2000/svg" width="73" height="73" fill="none"
			><path fill="#333" d="M36.5 2 59 64 36.5 50.5 14 64 36.5 2Z" /><path
				stroke="#333"
				d="M36.5 2 59 64 36.5 50.5 14 64 36.5 2Z"
			/></svg
		>
	</div>
</div>

<style>
	:root {
		--primary-color: #07d3c2;
	}
	.c-player-marker > svg {
		transform-origin: center;
		filter: drop-shadow(0 0 5px var(--primary-color));
	}
	.c-player-marker > svg > path {
		fill: var(--primary-color);
	}
</style>
