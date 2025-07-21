<script lang="ts">
	import type { StreetViewPoint } from '$routes/map/+page.svelte';
	import type { LngLat } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';

	interface Props {
		map: maplibregl.Map;
		lngLat: LngLat | null;
		show: boolean;
		rotation: number; // Optional rotation property
	}
	let { lngLat = $bindable(), map, show = $bindable(), rotation = $bindable() }: Props = $props();
	let container = $state<HTMLElement | null>(null);
	let marker: maplibregl.Marker | null = $state.raw(null);

	onMount(() => {
		if (container && show) {
			marker = new maplibregl.Marker({
				element: container,
				pitchAlignment: 'map',
				rotationAlignment: 'map',
				anchor: 'center',
				draggable: true,
				rotation: rotation
			})
				.setLngLat(lngLat)
				.addTo(map);

			marker?.on('dragend', () => {
				// const lngLat = angleMarker?.getLngLat();
				// if (!lngLat) return;
				// const point = turfNearestPoint([lngLat.lng, lngLat.lat], streetViewPointData);
				// setPoint(point as StreetViewPoint);
			});
		}
	});

	$effect(() => {
		if (!show) {
			if (marker) {
				marker.remove();
				marker = null;
			}
		} else {
			if (marker) {
				marker.setLngLat(lngLat);
			} else {
				marker = new maplibregl.Marker({
					element: container,
					anchor: 'center'
				})
					.setLngLat(lngLat)
					.addTo(map);
			}
		}
	});

	// マーカーの回転
	$effect(() => {
		if (rotation && marker) {
			marker.setRotation(-rotation + 180);
		}
	});

	onDestroy(() => {
		marker?.remove();
	});
</script>

{#if show}
	<div
		bind:this={container}
		class="pointer-events-none relative grid h-[100px] w-[100px] place-items-center"
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
{/if}

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
