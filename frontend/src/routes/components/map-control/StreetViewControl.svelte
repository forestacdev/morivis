<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	import { showStreetViewLayer } from '$routes/store/layers';
	import { mapStore } from '$routes/store/map';
	import { isBBoxInside } from '$routes/utils/map';
	import type { LngLatBoundsLike } from 'maplibre-gl';

	const toggleLayer = () => {
		showStreetViewLayer.set(!$showStreetViewLayer);

		if ($showStreetViewLayer) {
			const bounds = mapStore.getMapBounds();
			const defaultBounds = [136.91278, 35.543576, 136.92986, 35.556704] as LngLatBoundsLike;

			if (!isBBoxInside(bounds, defaultBounds)) {
				mapStore.fitBounds(defaultBounds, {
					padding: 20,
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
		class="h-7 w-7 {$showStreetViewLayer ? 'text-main-accent' : 'text-base'}"
	/>
</button>

<style>
</style>
