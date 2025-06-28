<script lang="ts">
	import type { LngLat } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';
	import { propData } from '$routes/data/propData';
	import { mapStore, isHoverPoiMarker } from '$routes/store/map';
	import type { FeatureMenuData } from '$routes/types';

	interface Props {
		map: maplibregl.Map;
		featureId: string;
		lngLat: LngLat | null;
		properties: { [key: string]: any };
		onClick: (featureId: string) => void;
	}

	let { lngLat = $bindable(), map, properties, featureId, onClick }: Props = $props();
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

		// TODO: 整理
		if (id === 'fac_top') {
			imageUrl = properties.image;
		} else {
			imageUrl = propData[id].image;
		}
	});

	const jumpToFac = () => {
		mapStore.jumpToFac();
	};

	const click = () => {
		onClick(featureId);
	};

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
</script>

{#if properties._prop_id === 'fac_top'}
	<button
		bind:this={container}
		class="pointer-events-auto relative grid h-[100px] w-[100px] cursor-pointer place-items-center"
		onclick={jumpToFac}
		onfocus={() => isHoverPoiMarker.set(true)}
		onblur={() => isHoverPoiMarker.set(false)}
		onmouseover={() => isHoverPoiMarker.set(true)}
		onmouseleave={() => isHoverPoiMarker.set(false)}
	>
		{#if imageUrl}
			<img
				class="drop-shadow-purple-50 absolute h-[60px] w-[60px] rounded-full object-cover transition-all duration-150 hover:scale-110"
				src={imageUrl}
				alt={properties.name}
			/>
		{/if}
	</button>
{:else}
	<button
		bind:this={container}
		class="pointer-events-auto relative grid h-[100px] w-[100px] cursor-pointer place-items-center"
		onclick={click}
		onfocus={() => isHoverPoiMarker.set(true)}
		onblur={() => isHoverPoiMarker.set(false)}
		onmouseover={() => isHoverPoiMarker.set(true)}
		onmouseleave={() => isHoverPoiMarker.set(false)}
	>
		{#if imageUrl}
			<img
				class="border-base drop-shadow-purple-50 absolute h-[60px] w-[60px] rounded-full border-4 object-cover transition-all duration-150 hover:scale-110"
				src={imageUrl}
				alt={properties.name || 'Marker Image'}
			/>
		{/if}
	</button>
{/if}

<style>
</style>
