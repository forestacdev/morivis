<script lang="ts">
	import type { LngLat } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide, fly } from 'svelte/transition';

	import LayerIcon from '$routes/components/atoms/LayerIcon.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	interface Props {
		map: maplibregl.Map;
		lngLat: LngLat | null;
		show: boolean;
	}
	let { lngLat = $bindable(), map, show = $bindable() }: Props = $props();
	let container = $state<HTMLElement | null>(null);
	let marker: maplibregl.Marker | null = $state.raw(null);

	onMount(() => {
		if (container && show) {
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
			if (marker) {
				marker.setLngLat(lngLat);
			} else {
				marker = new maplibregl.Marker({
					element: container,
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
		class="pointer-events-none relative z-50 grid h-[100px] w-[100px] place-items-center"
	>
		<div class="css-ripple-effect"></div>
		<div class="border-main absolute h-[12px] w-[12px] rounded-full border-[2px] bg-white"></div>

		<div class="border-main absolute h-[24px] w-[24px] rounded-full border-2"></div>
		<div class="border-base absolute h-[20px] w-[20px] rounded-full border-2"></div>
	</div>
{/if}

<style>
	/* エフェクト要素 */
	.css-ripple-effect {
		width: 70px;
		height: 70px;
		position: absolute;
		border-radius: 100%;
		pointer-events: none;
		opacity: 0;
		animation: ripple 1.5s ease-out infinite;
		background-color: var(--color-base);
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
