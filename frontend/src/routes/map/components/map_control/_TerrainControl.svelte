<script lang="ts">
	import Icon from '@iconify/svelte';
	import { gsap } from 'gsap';
	import { Draggable } from 'gsap/Draggable';
	import { set3dParams } from '$routes/map/utils/params';
	import type {
		Map,
		StyleSpecification,
		SourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker
	} from 'maplibre-gl';
	import { onMount } from 'svelte';

	import { mapStore, isTerrain3d } from '$routes/stores/map';

	const toggle3d = (e: any) => {
		isTerrain3d.set(!$isTerrain3d);
	};

	isTerrain3d.subscribe((is3d) => {
		const map = mapStore.getMap();
		if (!map || !map.loaded()) return;
		try {
			if (is3d) {
				if (map.getSource('terrain')) {
					map.setTerrain({
						source: 'terrain',
						exaggeration: 1.0
					});
					set3dParams('1');
					map.easeTo({ pitch: 60 });
				}
			} else {
				if (map.getTerrain()) {
					map.setTerrain(null);
				}
				map.easeTo({ pitch: 0 });
			}
		} catch (error) {
			console.error('Terrain control error:', error);
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
	class="pointer-events-auto grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center p-2 drop-shadow-lg"
>
	<Icon icon={$isTerrain3d ? 'mdi:video-2d' : 'mdi:video-3d'} class="h-8 w-8 text-base" />
</button>

<style>
</style>
