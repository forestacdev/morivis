<script lang="ts">
	import type { LngLat } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';
	import { propData } from '$routes/map/data/prop_data';
	import { mapStore, isHoverPoiMarker } from '$routes/stores/map';
	import { fade, fly } from 'svelte/transition';

	interface Props {
		map: maplibregl.Map;
		featureId: number;
		lngLat: LngLat | null;
		properties: { [key: string]: any };
		clickId: number | null; // クリックされたPOIのID
		onClick: (featureId: number) => void;
	}

	let { lngLat = $bindable(), map, properties, featureId, onClick, clickId }: Props = $props();
	let markerContainer = $state<HTMLElement | null>(null);
	let marker: maplibregl.Marker | null = $state.raw(null);
	let name: maplibregl.Marker | null = $state.raw(null);
	let nameContainer: HTMLElement | null = $state.raw(null);
	let imageUrl: string | null = $state.raw(null);
	let isReady = $state(false); // マーカーの準備完了フラグ

	let isHover = $state(false);

	onMount(() => {
		if (markerContainer && lngLat) {
			marker = new maplibregl.Marker({
				element: markerContainer,
				anchor: 'center',
				offset: [0, 0]
			})
				.setLngLat(lngLat)
				.addTo(map);
		}

		if (nameContainer && lngLat) {
			name = new maplibregl.Marker({
				element: nameContainer,
				anchor: 'center',
				offset: [0, 40]
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

		// 準備完了フラグを設定
		isReady = true;
	});

	const jumpToFac = () => {
		mapStore.jumpToFac();
	};

	const onHover = (val: boolean) => {
		isHoverPoiMarker.set(val);
		isHover = val;
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
		name?.remove();
		marker = null;
		name = null;
	});
</script>

{#if properties._prop_id === 'fac_top'}
	<button
		bind:this={markerContainer}
		class="pointer-events-auto relative grid h-[100px] w-[100px] cursor-pointer place-items-center drop-shadow-md"
		onclick={jumpToFac}
		onfocus={() => onHover(true)}
		onblur={() => onHover(false)}
		onmouseover={() => onHover(true)}
		onmouseleave={() => onHover(false)}
	>
		{#if imageUrl}
			<img
				class="absolute h-[50px] w-[50px] rounded-full object-cover transition-all duration-150 hover:scale-110"
				src={imageUrl}
				alt={properties.name}
			/>
		{/if}
	</button>
{:else}
	<div
		bind:this={markerContainer}
		class="pointer-events-none relative grid w-[150px] place-items-center"
	>
		{#if isReady}
			<button
				class="peer pointer-events-auto relative grid h-[50px] w-[50px] cursor-pointer place-items-center drop-shadow-md"
				onclick={click}
				onfocus={() => onHover(true)}
				onblur={() => onHover(false)}
				onmouseover={() => onHover(true)}
				onmouseleave={() => onHover(false)}
			>
				{#if imageUrl}
					<img
						class="border-base border-3 absolute h-full w-full rounded-full object-cover transition-all duration-150 {isHover ||
						clickId === featureId
							? 'scale-110'
							: ''}"
						src={imageUrl}
						alt={properties.name || 'Marker Image'}
					/>
				{/if}
			</button>
		{/if}
	</div>

	<div
		bind:this={nameContainer}
		class="items-top pointer-events-none relative z-10 flex w-[170px] justify-center"
	>
		{#if isHover || clickId === featureId}
			<div
				transition:fly={{ duration: 200, y: -10, opacity: 0 }}
				class="pointer-none wrap-nowrap bg-base absolute rounded-full p-1 px-2 text-center text-sm text-gray-800"
			>
				{properties.name}
			</div>
		{/if}
	</div>
{/if}

<style>
</style>
