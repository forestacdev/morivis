<script lang="ts">
	import Icon from '@iconify/svelte';
	import { gsap } from 'gsap';
	import { Draggable } from 'gsap/Draggable';
	import type {
		Map,
		StyleSpecification,
		SourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker
	} from 'maplibre-gl';
	import { onMount } from 'svelte';

	import { isTerrain3d } from '$routes/store';
	import { mapStore } from '$routes/store/map';

	const toggle3d = (e: any) => {
		isTerrain3d.set(!$isTerrain3d);
	};

	isTerrain3d.subscribe((is3d) => {
		const map = mapStore.getMap();
		if (!map) return;
		if (is3d) {
			map.setTerrain({
				source: 'terrain',
				exaggeration: 1.0
			});
			map.easeTo({ pitch: 60 });
		} else {
			map.setTerrain(null);
			map.easeTo({ pitch: 0 });
		}
	});

	let element = $state<HTMLButtonElement | null>(null);
	// let rotation = $state<number>(0);

	onMount(() => {
		if (!element) return;
	});
</script>

<button
	bind:this={element}
	onclick={toggle3d}
	class="grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center p-2"
>
	<Icon icon={$isTerrain3d ? 'mdi:video-2d' : 'mdi:video-3d'} class="h-8 w-8 text-base" />
</button>

<style>
</style>
