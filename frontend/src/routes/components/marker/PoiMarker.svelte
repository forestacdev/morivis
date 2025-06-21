<script lang="ts">
	import type { LngLat } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';
	import { propData } from '$routes/data/propData';

	interface Props {
		map: maplibregl.Map;
		lngLat: LngLat | null;
		properties: { [key: string]: any };
	}
	let { lngLat = $bindable(), map, properties }: Props = $props();
	let container = $state<HTMLElement | null>(null);
	let marker: maplibregl.Marker | null = $state.raw(null);
	let imageUrl: string | null = $state.raw(null);

	onMount(() => {
		if (container && lngLat) {
			marker = new maplibregl.Marker({
				element: container,
				anchor: 'center',
				offset: [0, 0]
			})
				.setLngLat(lngLat)
				.addTo(map);
		}

		const id = properties._prop_id;
		imageUrl = propData[id].image;
	});

	// $effect(() => {
	// 	if (marker && lngLat && container) {
	// 		marker = new maplibregl.Marker({
	// 			element: container,
	// 			anchor: 'center',
	// 			offset: [0, 0]
	// 		})
	// 			.setLngLat(lngLat)
	// 			.addTo(map);
	// 	}
	// });

	onDestroy(() => {
		marker?.remove();
	});

	const click = () => {};
</script>

<button
	bind:this={container}
	class="pointer-events-auto relative grid h-[100px] w-[100px] cursor-pointer place-items-center"
	onclick={click}
>
	{#if imageUrl}
		<img
			class="border-base drop-shadow-purple-50 absolute h-[60px] w-[60px] rounded-full border-4 object-cover transition-all duration-150 hover:scale-110"
			src={imageUrl}
			alt={properties.name || 'Marker Image'}
			crossOrigin="anonymous"
		/>
	{/if}
</button>

<style>
</style>
