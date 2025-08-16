<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	import { selectedBaseMap, showLabelLayer } from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';
	import { isBBoxInside } from '$routes/map/utils/map';
	import type { LngLatBoundsLike } from 'maplibre-gl';
	import type { BaseMapType } from '$routes/stores/layers';

	const toggleLayer = () => {
		showLabelLayer.set(!$showLabelLayer);
	};

	let element = $state<HTMLButtonElement | null>(null);

	let showMenu = $state<boolean>(false);

	onMount(() => {
		if (!element) return;
	});
</script>

<button
	bind:this={element}
	onclick={() => {
		showMenu = !showMenu;
	}}
	class="pointer-events-auto grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center p-2 drop-shadow-lg"
>
	<Icon icon="hugeicons:layer" class="h-8 w-8 {$showLabelLayer ? 'text-accent' : 'text-base'}" />
</button>

{#if showMenu}
	<div
		class="bg-base absolute right-0 top-[60px] z-10 flex w-[200px] flex-col rounded-lg p-2 shadow-lg"
	>
		<button
			onclick={() => {
				$selectedBaseMap = 'satellite';
			}}
			class="flex items-center justify-start gap-2 rounded-md p-2 transition-colors duration-150 hover:bg-gray-100"
		>
			航空写真
		</button>
		<button
			onclick={() => {
				$selectedBaseMap = 'hillshade';
			}}
			class="flex items-center justify-start gap-2 rounded-md p-2 transition-colors duration-150 hover:bg-gray-100"
		>
			地形図
		</button>
	</div>
{/if}

<style>
</style>
