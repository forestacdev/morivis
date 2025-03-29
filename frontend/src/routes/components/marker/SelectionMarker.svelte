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
		<div class="absolute h-[8px] w-[8px] rounded-full bg-white"></div>
	</div>
{/if}

<style>
	/* クリックできる要素 */

	/* エフェクト要素 */
	.css-ripple-effect {
		/* 値の変更はエフェクト形体・サイズ・スピードに影響する */
		width: 100px;
		height: 100px;
		background: #ffffff;

		/* 必須 */
		position: absolute;
		border-radius: 100%;
		pointer-events: none;
		transform: scale(0);
		opacity: 0;
		animation: ripple 1.75s ease-out infinite;
	}

	/* アニメーションの定義 */
	@keyframes ripple {
		0% {
			opacity: 1;
		}
		60% {
			transform: scale(1.5);
			opacity: 0;
		}
		100% {
			transform: scale(1.5);
			opacity: 0;
		}
	}
</style>
