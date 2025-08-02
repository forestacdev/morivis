<script lang="ts">
	import { scale } from 'svelte/transition';
	import type { LngLat } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';

	interface Props {
		map: maplibregl.Map;
		lngLat: LngLat | null;
		show: boolean;
	}
	let { lngLat = $bindable(), map, show = $bindable() }: Props = $props();
	let container = $state<HTMLElement | null>(null);
	let marker: maplibregl.Marker | null = $state.raw(null);

	onMount(() => {
		if (container && show && lngLat) {
			marker = new maplibregl.Marker({
				element: container,
				anchor: 'center',
				offset: [0, 0]
			})
				.setLngLat(lngLat)
				.addTo(map);
		}
	});

	$effect(() => {
		if (!show) {
			if (marker) {
				marker.remove();
				marker = null;
			}
		} else {
			if (marker && lngLat) {
				marker.setLngLat(lngLat);
			} else {
				marker = new maplibregl.Marker({
					element: container as HTMLElement,
					anchor: 'center',
					offset: [0, 0]
				})
					.setLngLat(lngLat)
					.addTo(map);
			}
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
		<div class="c-ripple-effect"></div>
		<div class="border-main absolute h-[12px] w-[12px] rounded-full border-[2px] bg-white"></div>

		<div class="border-main c-scale-effect absolute h-[24px] w-[24px] rounded-full border-2"></div>

		<div class="border-base c-scale-effect absolute h-[20px] w-[20px] rounded-full border-2"></div>
	</div>
{/if}

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
