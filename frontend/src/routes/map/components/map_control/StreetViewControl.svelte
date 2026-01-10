<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { LngLatBoundsLike } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import { isBBoxInside } from '$routes/map/utils/map';
	import { showStreetViewLayer } from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';

	const toggleLayer = () => {
		showStreetViewLayer.set(!$showStreetViewLayer);

		if ($showStreetViewLayer) {
			const bounds = mapStore.getMapBounds();
			const defaultBounds: LngLatBoundsLike = [136.91278, 35.543576, 136.92986, 35.556704];

			if (!isBBoxInside(bounds, defaultBounds)) {
				mapStore.fitBounds(defaultBounds, {
					padding: 0,
					duration: 1000,
					animate: true
				});
			}
		}
	};

	let element = $state<HTMLButtonElement | null>(null);

	onMount(() => {
		if (!element) return;
	});
</script>

<button
	bind:this={element}
	onclick={toggleLayer}
	class="pointer-events-auto grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center p-2 drop-shadow-lg"
>
	<Icon
		icon="fa6-solid:street-view"
		class="h-7 w-7 {$showStreetViewLayer ? 'text-accent' : 'text-base'}"
	/>
</button>

<style>
</style>
