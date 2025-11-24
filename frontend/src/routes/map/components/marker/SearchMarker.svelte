<script lang="ts">
	import { scale } from 'svelte/transition';
	import type { LngLat } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';
	import type {
		ResultAddressData,
		ResultCoordinateData,
		ResultData,
		ResultPoiData
	} from '$routes/map/utils/feature';

	interface Props {
		map: maplibregl.Map;
		selectedSearchId: number | null;
		prop: ResultPoiData | ResultAddressData | undefined;
	}
	let { map, selectedSearchId = $bindable(), prop }: Props = $props();
	let container = $state<HTMLElement | null>(null);
	let marker: maplibregl.Marker | null = $state.raw(null);

	onMount(() => {
		if (selectedSearchId && prop) {
			marker = new maplibregl.Marker({
				scale: 1.2,
				color: '#FF0000'
			})
				.setLngLat(new maplibregl.LngLat(prop.point[0], prop.point[1]))
				.addTo(map);
		}
	});

	$effect(() => {
		if (!selectedSearchId) {
			if (marker) {
				marker.remove();
				marker = null;
			}
		} else {
			if (marker && prop) {
				marker.setLngLat(new maplibregl.LngLat(prop.point[0], prop.point[1]));
			}
		}
	});

	onDestroy(() => {
		marker?.remove();
		selectedSearchId = null;
	});
</script>

<!-- {#if selectedSearchId}
	<div
		bind:this={container}
		class="pointer-events-none relative grid h-[100px] w-[100px] place-items-center"
	>
		<div class="c-ripple-effect"></div>
		<div class="border-main absolute h-[12px] w-[12px] rounded-full border-[2px] bg-red-500"></div>

		<div class="border-main c-scale-effect absolute h-[24px] w-[24px] rounded-full border-2"></div>

		<div class="border-base c-scale-effect absolute h-[20px] w-[20px] rounded-full border-2"></div>
	</div>
{/if} -->

<style>
	/* エフェクト要素 */
	.c-ripple-effect {
		width: 70px;
		height: 70px;
		position: absolute;
		border-radius: 100%;
		pointer-events: none;
		opacity: 0;
		animation: ripple 1.5s ease-out infinite;
		background-color: var(--color-base);
	}

	.c-scale-effect {
		animation: scale 0.15s ease-out;
	}

	@keyframes scale {
		0% {
			scale: 6;
			opacity: 0;
		}

		100% {
			scale: 1;
			opacity: 1;
		}
	}

	/* アニメーションの定義 */
	@keyframes ripple {
		0% {
			opacity: 0.5;
			scale: 0;
		}
		60% {
			scale: 1.5;
			opacity: 0;
		}
		100% {
			scale: 1.5;
			opacity: 0;
		}
	}
</style>
