<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	import { showLabelLayer } from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';
	import { isBBoxInside } from '$routes/map/utils/map';
	import type { LngLatBoundsLike } from 'maplibre-gl';

	const toggleLayer = () => {
		showLabelLayer.set(!$showLabelLayer);
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
	<Icon icon="mynaui:label-solid" class="h-7 w-7 {$showLabelLayer ? 'text-accent' : 'text-base'}" />
</button>

<style>
</style>
