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
	<div class="poi-icon-effect" style:transform-origin={transformOrigin}>
		<img src={iconImage} alt="" draggable="false" />
		<span class="ripple"></span>
		<span class="ripple ripple-delayed"></span>
	</div>
</div>

<style>
	.poi-icon-marker {
		pointer-events: none;
		z-index: 1;
	}

	.poi-icon-effect {
		position: relative;
		width: 100%;
		height: 100%;
		transform: scale(1.2);
		animation: pop-in 180ms ease-out;
	}

	img {
		display: block;
		width: 100%;
		height: 100%;
		max-width: none;
		filter: drop-shadow(0 1px 3px rgb(0 0 0 / 30%));
	}

	.ripple {
		position: absolute;
		inset: 0;
		border: 2px solid #fffbeb;
		border-radius: 50%;
		opacity: 0;
		animation: ripple 1.5s linear infinite;
	}

	.ripple-delayed {
		animation-delay: 0.75s;
	}

	@keyframes ripple {
		from {
			scale: 1.2;
			opacity: 0.8;
		}
		to {
			scale: 1.8;
			opacity: 0;
		}
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
		.poi-icon-effect {
			animation: none;
		}
		.ripple {
			display: none;
			animation: none;
		}
	}
</style>
