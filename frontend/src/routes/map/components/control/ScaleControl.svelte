<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import type { Map } from 'maplibre-gl';
	import { onMount } from 'svelte';

	export let map: Map;
	let controlContainer: HTMLDivElement;

	onMount(() => {
		if (map) {
			// スケールバーのコントロールを作成
			const scaleControl = new maplibregl.ScaleControl({
				maxWidth: 150,
				unit: 'metric'
			});

			// スケールバーのコントロールをマップに追加
			controlContainer.appendChild(scaleControl.onAdd(map));
		}
	});
</script>

<div class="absolute left-1 max-lg:bottom-11 lg:bottom-9" bind:this={controlContainer}></div>

<style>
</style>
