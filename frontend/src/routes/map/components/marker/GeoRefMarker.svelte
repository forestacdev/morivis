<script lang="ts">
	import type { LngLat } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onDestroy } from 'svelte';

	interface Props {
		map: maplibregl.Map;
		lngLat: LngLat;
		label: string;
		onDrag: (lngLat: LngLat) => void;
	}

	let { map, lngLat = $bindable(), label, onDrag }: Props = $props();
	let container = $state<HTMLElement | null>(null);
	let marker: maplibregl.Marker | null = $state.raw(null);

	$effect(() => {
		if (container && !marker) {
			marker = new maplibregl.Marker({
				element: container,
				anchor: 'center',
				draggable: true
			})
				.setLngLat(lngLat)
				.addTo(map);

			marker.on('drag', () => {
				if (marker) {
					const pos = marker.getLngLat();
					lngLat = pos;
					onDrag(pos);
				}
			});
		}
	});

	$effect(() => {
		if (marker && lngLat) {
			const current = marker.getLngLat();
			if (Math.abs(current.lng - lngLat.lng) > 1e-8 || Math.abs(current.lat - lngLat.lat) > 1e-8) {
				marker.setLngLat(lngLat);
			}
		}
	});

	onDestroy(() => {
		marker?.remove();
	});
</script>

<div
	bind:this={container}
	class="pointer-events-none relative grid h-[28px] w-[28px] place-items-center"
>
	<div
		bind:this={container}
		class="bg-accent pointer-events-auto grid h-full w-full cursor-grab place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-lg transition-transform select-none hover:scale-120 active:cursor-grabbing"
	>
		{label}
	</div>
	<div
		class="c-ripple-effect absolute top-0 h-full w-full rounded-full border-2 border-amber-50"
	></div>
	<div
		class="c-ripple-effect2 absolute top-0 h-full w-full rounded-full border-2 border-amber-50"
	></div>
</div>

<style>
	/* エフェクト要素 */
	.c-ripple-effect {
		opacity: 0;
		animation: ripple 1.5s linear infinite;
	}

	.c-ripple-effect2 {
		opacity: 0;
		animation: ripple 1.5s 0.75s linear infinite;
	}

	/* アニメーションの定義 */
	@keyframes ripple {
		0% {
			scale: 1.2;
			opacity: 0.8;
		}

		100% {
			scale: 1.8;
			opacity: 0;
		}
	}
</style>
