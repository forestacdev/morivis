<script lang="ts">
	import { onMount } from 'svelte';

	import type { PoiIconMarkerAppearance } from '$routes/map/types';
	import maplibregl from '$routes/map/utils/maplibre';

	interface Props {
		map: maplibregl.Map;
		point: [number, number];
		iconImage: string;
		appearance: PoiIconMarkerAppearance;
	}
	let { map, point, iconImage, appearance }: Props = $props();
	let container: HTMLDivElement;
	const transformOrigin = $derived(appearance.anchor.replaceAll('-', ' '));

	onMount(() => {
		const marker = new maplibregl.Marker({
			element: container,
			anchor: appearance.anchor,
			offset: appearance.offset,
			rotation: appearance.rotation,
			rotationAlignment: appearance.rotationAlignment,
			pitchAlignment: appearance.pitchAlignment,
			opacity: appearance.opacity,
			subpixelPositioning: true
		})
			.setLngLat(point)
			.addTo(map);
		return () => marker.remove();
	});
</script>

<div
	bind:this={container}
	class="poi-icon-marker"
	style:width="{appearance.width}px"
	style:height="{appearance.height}px"
	aria-hidden="true"
>
	<img src={iconImage} alt="" draggable="false" style:transform-origin={transformOrigin} />
</div>

<style>
	.poi-icon-marker {
		pointer-events: none;
		z-index: 1;
	}

	img {
		display: block;
		width: 100%;
		height: 100%;
		max-width: none;
		transform: scale(1.2);
		filter: drop-shadow(0 1px 3px rgb(0 0 0 / 30%));
		animation: pop-in 180ms ease-out;
	}

	@keyframes pop-in {
		from {
			transform: scale(1);
		}
		to {
			transform: scale(1.2);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		img {
			animation: none;
		}
	}
</style>
