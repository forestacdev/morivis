<script lang="ts">
	import type { LngLat } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';
	import { isHoverPoiMarker } from '$routes/stores/map';
	import { fly } from 'svelte/transition';
	import { type EpsgCode } from '$routes/map/utils/proj/dict';

	interface Props {
		map: maplibregl.Map;
		lngLat: LngLat | null;
		properties: { [key: string]: any };
		selectedEpsgCode: EpsgCode; // クリックされたPOIのID
		onClick: (code: EpsgCode) => void;
	}

	let { lngLat = $bindable(), map, properties, onClick, selectedEpsgCode }: Props = $props();
	let markerContainer = $state<HTMLElement | null>(null);
	let marker: maplibregl.Marker | null = $state.raw(null);
	let name: maplibregl.Marker | null = $state.raw(null);
	let nameContainer: HTMLElement | null = $state.raw(null);
	let isReady = $state(false); // マーカーの準備完了フラグ

	let isHover = $state(false);

	onMount(() => {
		if (!map || !lngLat) {
			console.warn('Map or lngLat is not defined');
			return;
		}
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

		// 準備完了フラグを設定
		isReady = true;
	});

	const onHover = (val: boolean) => {
		isHoverPoiMarker.set(val);
		isHover = val;
	};

	const click = () => {
		onClick(properties.code);
	};

	onDestroy(() => {
		marker?.remove();
		name?.remove();
		marker = null;
		name = null;
	});
</script>

<div
	bind:this={markerContainer}
	class="pointer-events-none relative grid w-[150px] place-items-center"
>
	{#if isReady}
		<button
			class="peer pointer-events-auto relative z-0 grid h-[60px] w-[60px] cursor-pointer place-items-center rounded-full bg-white p-2"
			onclick={click}
			onfocus={() => onHover(true)}
			onblur={() => onHover(false)}
			onmouseover={() => onHover(true)}
			onmouseleave={() => onHover(false)}
		>
			{properties.code}
		</button>
	{/if}
</div>

<div
	bind:this={nameContainer}
	class="items-top pointer-events-none relative z-10 flex w-[150px] justify-center"
>
	{#if isHover || selectedEpsgCode === properties.code}
		<div
			transition:fly={{ duration: 200, y: -10, opacity: 0 }}
			class="pointer-none wrap-nowrap bg-base absolute rounded-full p-1 px-2 text-center text-sm text-gray-800"
		>
			{properties.name_ja}
		</div>
	{/if}
</div>

<style>
</style>
