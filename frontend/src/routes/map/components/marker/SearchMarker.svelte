<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	import type {
		ResultAddressData,
		ResultCoordinateData,
		ResultPoiData
	} from '$routes/map/utils/data/search-result';
	import maplibregl from '$routes/map/utils/maplibre';

	interface Props {
		map: maplibregl.Map;
		prop: ResultPoiData | ResultAddressData | ResultCoordinateData | null;
	}
	let { map, prop }: Props = $props();
	let nameContainer = $state<HTMLElement | null>(null);
	let marker: maplibregl.Marker | null = $state.raw(null);
	let nameMarker: maplibregl.Marker | null = $state.raw(null);

	onMount(() => {
		if (prop) {
			marker = new maplibregl.Marker({
				scale: 1.2,
				color: '#FF0000'
			})
				.setLngLat(new maplibregl.LngLat(prop.point[0], prop.point[1]))
				.addTo(map);
		}

		if (nameContainer && prop) {
			nameMarker = new maplibregl.Marker({
				element: nameContainer,
				anchor: 'center',
				offset: [0, 40]
			})
				.setLngLat(new maplibregl.LngLat(prop.point[0], prop.point[1]))
				.addTo(map);
		}
	});

	$effect(() => {
		if (!prop) {
			if (marker) {
				marker.remove();
				marker = null;
			}
			if (nameMarker) {
				nameMarker.remove();
				nameMarker = null;
			}
		} else {
			const lngLat = new maplibregl.LngLat(prop.point[0], prop.point[1]);
			marker?.setLngLat(lngLat);
			nameMarker?.setLngLat(lngLat);
		}
	});

	onDestroy(() => {
		marker?.remove();
		nameMarker?.remove();
	});
</script>

<div
	bind:this={nameContainer}
	class="items-top pointer-events-none relative z-10 flex w-[240px] -translate-y-6 justify-center"
>
	{#if prop}
		<div
			transition:fly={{ duration: 200, y: -10, opacity: 0 }}
			class="bg-base absolute rounded-full p-1 px-3 text-center text-sm text-gray-800"
		>
			{prop.name}
		</div>
	{/if}
</div>

<style>
</style>
