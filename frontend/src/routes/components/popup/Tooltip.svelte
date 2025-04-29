<script lang="ts">
	import gsap from 'gsap';
	import type { LngLat } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onDestroy, onMount, type Snippet } from 'svelte';

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
		if (container) {
			gsap.to(container, {
				scale: 0,
				duration: 0.15,
				onComplete: () => {
					marker?.remove();
				}
			});
		}
	});
</script>

{#if show}
	<div
		bind:this={container}
		class="pointer-events-none relative z-50 grid h-[100px] w-[100px] place-items-center"
	>
		<!-- <div class="css-ripple-effect"></div> -->
		<div class="css-rotate-effect absolute h-[30px] w-[30px] rotate-45 border-2 border-white"></div>
	</div>
{/if}

<style>
	/* クリックできる要素 */

	.css-rotate-effect {
		/* 値の変更はエフェクト形体・サイズ・スピードに影響する */

		animation: scale 0.15s ease-out;
	}

	/* アニメーションの定義 */
	@keyframes rotate {
		100% {
			rotate: 360deg;
		}
	}

	@keyframes scale {
		0% {
			scale: 0;
		}
		100% {
			scale: 1;
		}
	}
</style>
